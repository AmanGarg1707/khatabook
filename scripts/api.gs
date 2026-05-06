function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    switch (body.action) {
      case 'add':          return addExpense(ss, body);
      case 'edit':         return editExpense(ss, body);
      case 'delete':       return deleteExpense(ss, body);
      case 'list':         return listExpenses(ss, body);
      case 'list_sheets':  return listSheets(ss);
      case 'list_tags':    return listTags(ss, body);
      default:             return jsonResponse({ error: 'Unknown action: ' + body.action });
    }
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

function getFYName(dateStr) {
  var parts = dateStr.split('-');
  var year = Number(parts[0]);
  var month = Number(parts[1]) - 1; // 0-indexed; April = 3
  var fyStart = month >= 3 ? year : year - 1;
  return 'FY ' + fyStart + '-' + String(fyStart + 1).slice(-2);
}

function getCurrentFYName() {
  var now = new Date();
  var tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  var todayStr = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
  return getFYName(todayStr);
}

function getOrCreateFYSheet(ss, fyName) {
  var sheet = ss.getSheetByName(fyName);
  if (!sheet) {
    sheet = ss.insertSheet(fyName);
    sheet.appendRow(['id', 'date', 'name', 'amount', 'tags']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function formatDate(val) {
  if (typeof val === 'string') return val;
  var tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  return Utilities.formatDate(val, tz, 'yyyy-MM-dd');
}

function rowToExpense(row) {
  return {
    id: Number(row[0]),
    date: formatDate(row[1]),
    name: String(row[2]),
    amount: Number(row[3]),
    tags: String(row[4]).split(',').map(function(t) { return t.trim(); }).filter(Boolean),
  };
}

function addExpense(ss, body) {
  var fyName = getFYName(body.date);
  var sheet = getOrCreateFYSheet(ss, fyName);
  var id = Date.now();
  sheet.appendRow([id, body.date, body.name, Number(body.amount), body.tags.join(',')]);
  return jsonResponse({ id: id });
}

function editExpense(ss, body) {
  var sheets = ss.getSheets();
  for (var s = 0; s < sheets.length; s++) {
    var data = sheets[s].getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (Number(data[i][0]) === Number(body.id)) {
        sheets[s].getRange(i + 1, 1, 1, 5).setValues([
          [body.id, body.date, body.name, Number(body.amount), body.tags.join(',')]
        ]);
        return jsonResponse({ ok: true });
      }
    }
  }
  return jsonResponse({ error: 'Expense not found' });
}

function deleteExpense(ss, body) {
  var sheets = ss.getSheets();
  for (var s = 0; s < sheets.length; s++) {
    var data = sheets[s].getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (Number(data[i][0]) === Number(body.id)) {
        sheets[s].deleteRow(i + 1);
        return jsonResponse({ ok: true });
      }
    }
  }
  return jsonResponse({ error: 'Expense not found' });
}

function getYearTotal(ss, fyName) {
  var sheet = ss.getSheetByName(fyName);
  if (!sheet) return 0;
  var data = sheet.getDataRange().getValues();
  var total = 0;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) total += Number(data[i][3]);
  }
  return total;
}

function listExpenses(ss, body) {
  var filter = body.filter;
  var value = body.value;
  var fyName = filter === 'year' ? value : (body.fyName || getCurrentFYName());
  var sheet = ss.getSheetByName(fyName);
  var expenses = [];

  if (sheet) {
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (!data[i][0]) continue;
      var expense = rowToExpense(data[i]);
      if (filter === 'month' && !expense.date.startsWith(value)) continue;
      if (filter === 'tag' && expense.tags.indexOf(value) === -1) continue;
      expenses.push(expense);
    }
  }

  expenses.sort(function(a, b) { return a.date < b.date ? 1 : -1; });

  return jsonResponse({
    expenses: expenses,
    filteredTotal: expenses.reduce(function(sum, e) { return sum + e.amount; }, 0),
    yearTotal: getYearTotal(ss, fyName),
  });
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function listSheets(ss) {
  var sheets = ss.getSheets()
    .map(function(s) { return s.getName(); })
    .filter(function(name) { return /^FY \d{4}-\d{2}$/.test(name); })
    .sort()
    .reverse();
  return jsonResponse({ sheets: sheets });
}

function listTags(ss, body) {
  var sheet = ss.getSheetByName(body.fyName);
  if (!sheet) return jsonResponse({ tags: [] });
  var data = sheet.getDataRange().getValues();
  var tagSet = {};
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    String(data[i][4]).split(',').forEach(function(t) {
      var trimmed = t.trim();
      if (trimmed) tagSet[trimmed] = true;
    });
  }
  return jsonResponse({ tags: Object.keys(tagSet).sort() });
}
