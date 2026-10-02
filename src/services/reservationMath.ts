export interface ReserveInput {
  bankCashPaise: number;
  envelopeReservedPaise: number;
  goalEarmarkPaise: number;
  sinkingFundReservedPaise: number;
}

/** Reservations label cash. They do not move the bank balance. */
export function reservationSnapshot(input: ReserveInput) {
  const reservedPaise = input.envelopeReservedPaise + input.goalEarmarkPaise + input.sinkingFundReservedPaise;
  return {
    bankCashPaise: input.bankCashPaise,
    reservedPaise,
    availableToSpendPaise: input.bankCashPaise - reservedPaise,
  };
}
