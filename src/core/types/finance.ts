/**
 * finance.ts — 재정 시스템 타입 정의 (예약)
 * Phase 8+에서 구현 예정. 현재는 인터페이스만 정의합니다.
 */

/** 재정 상태 */
export interface FinanceState {
  cash: number;
  income: number;
  expenses: number;
  loanAmount: number;
}

/** 거래 타입 */
export type TransactionType = 'income' | 'expense';

/** 거래 내역 */
export interface Transaction {
  type: TransactionType;
  category: string;
  amount: number;
  tick: number;
}
