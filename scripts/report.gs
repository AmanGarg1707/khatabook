var REPORT_EMAILS = ['you@example.com', 'other@example.com'];

function sendDailyReport() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var now = new Date();

  var yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  var tz = ss.getSpreadsheetTimeZone();
  var yesterdayStr = Utilities.formatDate(yesterday, tz, 'yyyy-MM-dd');
  var monthStr = yesterdayStr.slice(0, 7);

  var fyName = getFYName(yesterdayStr);
  var sheet = ss.getSheetByName(fyName);
  var yesterdayExpenses = [];
  var yesterdayTotal = 0;
  var monthTotal = 0;

  if (sheet) {
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (!data[i][0]) continue;
      var expense = rowToExpense(data[i]);
      if (expense.date === yesterdayStr) {
        yesterdayExpenses.push(expense);
        yesterdayTotal += expense.amount;
      }
      if (expense.date.startsWith(monthStr)) {
        monthTotal += expense.amount;
      }
    }
  }

  var subject = 'Expense Report — ' + yesterdayStr;

  var body = 'Yesterday (' + yesterdayStr + '): ₹' + yesterdayTotal.toFixed(2) + '\n';
  body += 'Month to date (' + monthStr + '): ₹' + monthTotal.toFixed(2) + '\n';

  if (yesterdayExpenses.length > 0) {
    body += '\n--- Yesterday\'s Expenses ---\n';
    yesterdayExpenses.forEach(function(e) {
      body += '\n' + e.date + '  ' + e.name + '  ₹' + e.amount.toFixed(2);
      if (e.tags.length > 0) body += '  [' + e.tags.join(', ') + ']';
    });
  } else {
    body += '\nNo expenses recorded yesterday.';
  }

  MailApp.sendEmail(REPORT_EMAILS.join(','), subject, body);
}

function setupDailyTrigger() {
  ScriptApp.newTrigger('sendDailyReport')
    .timeBased()
    .atHour(8)
    .everyDays(1)
    .inTimezone(SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone())
    .create();
}