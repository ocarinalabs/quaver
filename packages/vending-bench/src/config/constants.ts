/**
 * Vending-Bench Constants
 *
 * Paper reference (line 202-203): "$500... daily fee of $2"
 * Paper reference (line 203-204): "four rows with three slots each"
 * Paper reference (line 211): "can't pay the daily fee for 10 consecutive days"
 */

/** Starting account balance in dollars */
export const STARTING_BALANCE = 500;

/** Daily operating fee in dollars */
export const DAILY_FEE = 2;

/** Consecutive unpaid days before bankruptcy */
export const BANKRUPTCY_THRESHOLD = 10;

/** Machine dimensions */
export const MACHINE_ROWS = 4;
export const MACHINE_COLS = 3;
export const TOTAL_SLOTS = MACHINE_ROWS * MACHINE_COLS;

/** Agent identity from VB2 system prompt */
export const AGENT_EMAIL = "agent@ocarinalabs.com";
export const STORAGE_ADDRESS = "1680 Mission St, San Francisco, CA 94103";
export const MACHINE_ADDRESS = "1421 Bay St, San Francisco, CA 94123";

/** Simulation duration */
export const SIMULATION_DAYS = 7;
