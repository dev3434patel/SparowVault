/** Invoice recognition and settlement are separate. Tax here is arithmetic, not a filed return. */
export function invoiceThenReceipt(input: {
  taxablePaise: number;
  taxPaise: number;
  receiptPaise: number;
}) {
  const receivablePaise = input.taxablePaise + input.taxPaise;
  const revenuePaise = input.taxablePaise;
  return {
    receivablePaise,
    revenuePaise,
    openReceivablePaise: receivablePaise - input.receiptPaise,
  };
}

/** Moving average. A later customer collection must not call this again. */
export function movingAverageSale(input: {
  buyQty: number;
  buyRatePaise: number;
  sellQty: number;
  sellRatePaise: number;
}) {
  const qtyLeft = input.buyQty - input.sellQty;
  const unit = input.buyRatePaise;
  return {
    qtyLeft,
    stockValuePaise: qtyLeft * unit,
    cogsPaise: input.sellQty * unit,
    revenuePaise: input.sellQty * input.sellRatePaise,
  };
}

/** Accrual only. Payment of net payable is a second event. Rates are not verified. */
export function payrollAccrual(input: {
  grossPaise: number;
  employeePfPaise: number;
  otherDeductionPaise: number;
  employerPfPaise: number;
}) {
  const expensePaise = input.grossPaise + input.employerPfPaise;
  const netPayablePaise = input.grossPaise - input.employeePfPaise - input.otherDeductionPaise;
  return { expensePaise, netPayablePaise, ratesVerified: false as const };
}

export function dimensionSplit(totalPaise: number, parts: number[]) {
  const sum = parts.reduce((a, b) => a + b, 0);
  return { totalPaise, sumPaise: sum, balanced: sum === totalPaise };
}

/** Matching a cheque does not post cash. A fee is a separate voucher amount. */
export function chequeMatch(input: { bookCashPaise: number; chequePaise: number; feePaise: number }) {
  return {
    bookCashPaise: input.bookCashPaise,
    matchedPaise: input.chequePaise,
    feeStillNeedsVoucher: input.feePaise > 0,
  };
}
