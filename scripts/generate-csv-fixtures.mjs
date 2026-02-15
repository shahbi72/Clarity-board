#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { once } from 'node:events'

const args = new Set(process.argv.slice(2))
const withMillion = args.has('--with-million')
const seedArg = [...args].find((arg) => arg.startsWith('--seed='))
const seed = seedArg ? Number(seedArg.split('=')[1]) : 20260214

if (!Number.isFinite(seed)) {
  throw new Error(`Invalid --seed value: ${seedArg}`)
}

const OUT_DIR = path.resolve(process.cwd(), 'tests', 'fixtures')
const headers = [
  'date',
  'order_id',
  'product_name',
  'category',
  'quantity',
  'revenue',
  'cost',
  'discount',
  'tax',
  'shipping',
  'profit',
  'amount',
  'type',
  'currency',
  'notes',
]

const productNames = [
  'Wireless Earbuds Pro',
  'Caf\u00e9 Latte Mug',
  'Ni\u00f1o Starter Kit',
  '4K Monitor 27"',
  'Gaming Chair, Pro',
  '\u65c5\u884c Backpack',
  'Cr\u00e8me Br\u00fbl\u00e9e Torch',
  'Desk Lamp Max',
  'Mechanical Keyboard',
  'Water Bottle XL',
]

const categories = [
  'Electronics',
  'Home',
  'Toys',
  'Office',
  'Kitchen',
  'Fitness',
  'Travel',
]

const currencySymbols = ['$', '\u20ac', '\u00a3', '\u20b9', '\u00a5']
const currencyCodes = ['USD', 'EUR', 'GBP', 'JPY', 'INR', 'AUD', 'CAD', 'AED', 'SAR']
const statusNotes = [
  'Delivered on time.',
  'Customer asked: "gift wrap, please".',
  'Applied promo bundle, includes cable.',
  'Follow-up requested by support.',
  'Bundle promotion\nApplied at checkout.',
]

await fs.promises.mkdir(OUT_DIR, { recursive: true })

await writeDataset('ecommerce-small-200.csv', 200, ',', seed + 11)
await writeDataset('ecommerce-medium-20000.csv', 20_000, ',', seed + 21)
await writeDataset('ecommerce-large-200000.csv', 200_000, ',', seed + 31)
await writeDataset('ecommerce-small-200.semicolon.csv', 200, ';', seed + 41)
await writeDataset('ecommerce-small-200.tab.csv', 200, '\t', seed + 51)

if (withMillion) {
  await writeDataset('ecommerce-xlarge-1000000.csv', 1_000_000, ',', seed + 61)
}

await writeInvalidFixture('ecommerce-invalid.csv')

console.log('CSV fixtures generated:')
console.log(`- ${path.relative(process.cwd(), OUT_DIR)}`)
console.log('Regenerate with: pnpm run fixtures:generate')
if (!withMillion) {
  console.log('Optional 1,000,000-row file: pnpm run fixtures:generate -- --with-million')
}

async function writeDataset(fileName, rows, delimiter, localSeed) {
  const rng = mulberry32(localSeed)
  const filePath = path.join(OUT_DIR, fileName)
  const stream = fs.createWriteStream(filePath, { encoding: 'utf8' })

  await writeLine(stream, headers.join(delimiter))

  for (let i = 1; i <= rows; i += 1) {
    if (i % 503 === 0) {
      await writeLine(stream, '')
      continue
    }

    let row = buildRow(i, rng)
    if (i % 997 === 0) {
      // Truncate some rows on purpose to validate inconsistent row handling.
      row = row.slice(0, Math.max(4, row.length - randInt(rng, 1, 4)))
    }

    const line = row.map((value) => escapeValue(value, delimiter)).join(delimiter)
    await writeLine(stream, line)
  }

  stream.end()
  await once(stream, 'finish')
}

async function writeInvalidFixture(fileName) {
  const filePath = path.join(OUT_DIR, fileName)
  const lines = [
    'date,order_id,product_name,category,quantity,revenue,cost,discount,tax,shipping,profit,amount,type,currency,notes',
    '2026-02-10,INV-001,"Broken quote, line,Electronics,1,$500,$300,$10,$5,$15,$180,abc,revenue,$,"missing closing quote',
    '2026-02-11,INV-002,Missing Amount,Office,2,$200,$150,$0,$4,$6,$40,,expense,$,',
    '2026-02-12,INV-003,Text Amount,Home,1,$100,$80,$0,$2,$3,$15,N/A,revenue,$,invalid amount text',
  ]
  await fs.promises.writeFile(filePath, lines.join('\n'), 'utf8')
}

async function writeLine(stream, line) {
  if (!stream.write(`${line}\n`)) {
    await once(stream, 'drain')
  }
}

function buildRow(index, rng) {
  const date = randomDate(index, rng)
  const orderId = `ORD-${2024 + (index % 3)}-${String(index).padStart(7, '0')}`
  const productName = pick(rng, productNames)
  const category = pick(rng, categories)
  const quantity = rng() < 0.05 ? '' : String(randInt(rng, 1, 8))

  const baseRevenue = round2(randFloat(rng, 25, 1500))
  const baseCost = round2(baseRevenue * randFloat(rng, 0.35, 0.9))
  const discount = round2(baseRevenue * randFloat(rng, 0, 0.2))
  const tax = round2((baseRevenue - discount) * randFloat(rng, 0.03, 0.1))
  const shipping = round2(randFloat(rng, 0, 40))
  const profit = round2(baseRevenue - baseCost - shipping - tax + discount)

  const isRefund = rng() < 0.12
  const type = isRefund ? pick(rng, ['expense', 'debit']) : pick(rng, ['revenue', 'credit'])
  const amount = isRefund
    ? -round2(baseRevenue * randFloat(rng, 0.2, 1))
    : round2(baseRevenue - discount + tax + shipping)

  const currency =
    rng() < 0.9
      ? rng() < 0.78
        ? pick(rng, currencySymbols)
        : pick(rng, currencyCodes)
      : ''
  const notes = index % 17 === 0 ? pick(rng, statusNotes) : 'Standard order.'

  let amountValue = formatAmount(amount, currency, rng)
  let revenueValue = formatAmount(baseRevenue, currency, rng, { alwaysPositive: true })
  let costValue = formatAmount(baseCost, currency, rng, { alwaysPositive: true })
  let discountValue = formatAmount(discount, currency, rng, { alwaysPositive: true })
  let taxValue = formatAmount(tax, currency, rng, { alwaysPositive: true })
  let shippingValue = formatAmount(shipping, currency, rng, { alwaysPositive: true })
  let profitValue = rng() < 0.08 ? '' : formatAmount(profit, currency, rng)

  if (index % 157 === 0) amountValue = ''
  if (index % 389 === 0) amountValue = 'N/A'
  if (index % 463 === 0) revenueValue = ''
  if (index % 521 === 0) costValue = ''
  if (index % 577 === 0) profitValue = ''

  return [
    date,
    orderId,
    productName,
    category,
    quantity,
    revenueValue,
    costValue,
    discountValue,
    taxValue,
    shippingValue,
    profitValue,
    amountValue,
    type,
    currency,
    notes,
  ]
}

function randomDate(index, rng) {
  const year = 2024 + (index % 3)
  const month = randInt(rng, 1, 12)
  const day = randInt(rng, 1, 28)
  const formats = [
    () => `${year}-${pad2(month)}-${pad2(day)}`,
    () => `${pad2(month)}/${pad2(day)}/${year}`,
    () => `${pad2(day)}/${pad2(month)}/${year}`,
    () => `${year}/${pad2(month)}/${pad2(day)}`,
    () => `${monthName(month)} ${day}, ${year}`,
  ]
  return pick(rng, formats)()
}

function formatAmount(value, currency, rng, options = {}) {
  const alwaysPositive = Boolean(options.alwaysPositive)
  const amount = alwaysPositive ? Math.abs(value) : value
  let text = withThousands(Math.abs(amount).toFixed(2))
  const isCode = /^[A-Z]{3}$/.test(currency)

  if (currency && rng() < 0.65) {
    text = isCode ? `${currency} ${text}` : `${currency}${text}`
  } else if (currency && isCode && rng() < 0.08) {
    text = `${text} ${currency}`
  }

  if (amount < 0) {
    return rng() < 0.5 ? `(${text})` : `-${text}`
  }

  return text
}

function escapeValue(value, delimiter) {
  const raw = value == null ? '' : String(value)
  const mustQuote =
    raw.includes('"') || raw.includes('\n') || raw.includes('\r') || raw.includes(delimiter) || raw.includes(',')
  if (!mustQuote) return raw
  return `"${raw.replace(/"/g, '""')}"`
}

function withThousands(value) {
  const [integerPart, decimalPart] = value.split('.')
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return decimalPart == null ? grouped : `${grouped}.${decimalPart}`
}

function pick(rng, list) {
  return list[Math.floor(rng() * list.length)]
}

function randFloat(rng, min, max) {
  return rng() * (max - min) + min
}

function randInt(rng, min, max) {
  return Math.floor(randFloat(rng, min, max + 1))
}

function round2(value) {
  return Math.round(value * 100) / 100
}

function pad2(value) {
  return String(value).padStart(2, '0')
}

function monthName(month) {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1]
}

function mulberry32(seedValue) {
  let state = seedValue >>> 0
  return function random() {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

