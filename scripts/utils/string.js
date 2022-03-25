const ethers = require("ethers")

const fixedLength = (str, targetLen = 8) => {
  const len = str.length
  return "0".repeat(targetLen - len) + str
}

const fixedLengthLe = (str, targetLen = 8) => {
  const len = str.length
  return str + "0".repeat(targetLen - len)
}

const clear0x = (hexStr) => {
  return hexStr.startsWith("0x") ? hexStr.slice(2) : hexStr
}

const hexToBigNumber = (hexStr) => {
  if (hexStr === "0x" || !hexStr) {
    hexStr = "0x0"
  }
  return ethers.BigNumber.from(hexStr)
}

function getDeltaPercentString(lastAmount, amount, percentDecimal, alertPercent) {
  if (!lastAmount) {
    return ""
  }

  if (!percentDecimal) {
    percentDecimal = 4
  }

  const delta = amount - lastAmount
  const percent = (Math.abs(delta) / lastAmount) * 100
  let msg = ""
  if (percent >= alertPercent) {
    msg += "!!!"
  }

  if (delta < 0) {
    msg += `-${percent.toFixed(percentDecimal)}%`
  } else {
    msg += `+${percent.toFixed(percentDecimal)}%`
  }
  return msg
}

module.exports = {
  getDeltaPercentString,
  hexToBigNumber,
  fixedLength,
  fixedLengthLe,
  clear0x,
}
