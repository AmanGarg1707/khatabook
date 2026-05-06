import { getScriptUrl } from './storage'

async function apiFetch(body) {
  const url = getScriptUrl()
  if (!url) throw new Error('No script URL configured')
  const res = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data
}

export function addExpense({ date, name, amount, tags }) {
  return apiFetch({ action: 'add', date, name, amount, tags })
}

export function listExpenses({ filter, value, fyName }) {
  return apiFetch({ action: 'list', filter, value, fyName })
}

export function listSheets() {
  return apiFetch({ action: 'list_sheets' })
}

export function listTags(fyName) {
  return apiFetch({ action: 'list_tags', fyName })
}
