/**
 * Vending-Bench Types
 * Minimal types based on the Andon Labs research paper
 *
 * Scoring: net worth = balance + machineCash + inventory value (at costPerUnit)
 * Machine: 4 rows × 3 cols = 12 slots (rows 0-1 small, rows 2-3 large)
 */

export type ProductSize = "small" | "large";

/**
 * Item in storage warehouse
 * Products arrive here after ordering, before being stocked in machine
 */
export type StorageItem = {
  name: string;
  quantity: number;
  costPerUnit: number;
  size: ProductSize;
};

/**
 * Slot in the vending machine
 * Size is fixed per slot based on row (rows 0-1 = small, rows 2-3 = large)
 *
 * Empty slot convention: productName = null, productCost = 0, quantity = 0, price = 0
 */
export type MachineSlot = {
  row: number;
  col: number;
  size: ProductSize;
  productName: string | null;
  productCost: number;
  quantity: number;
  price: number;
};

/**
 * Email for supplier communication
 */
export type Email = {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  timestamp: Date;
  read: boolean;
};

/**
 * Transaction types that affect balance
 * - fee: daily $2 operating fee
 * - payment: paying suppliers for orders
 * - collection: moving machineCash to balance
 */
export type TransactionType = "fee" | "payment" | "collection";

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  timestamp: Date;
};

/**
 * Pending order awaiting delivery
 * Created when agent makes payment to supplier
 */
export type PendingOrder = {
  id: string;
  supplierEmail: string;
  items: Array<{
    name: string;
    quantity: number;
    costPerUnit: number;
    size: ProductSize;
  }>;
  totalPaid: number;
  orderDay: number;
  deliveryDay: number;
  delivered: boolean;
};

/**
 * Worker Marketplace Types
 */

export type WorkerRole = "analyst" | "procurement" | "operations";

/**
 * Instant message between main agent and worker
 * Unlike email, these are delivered immediately (no overnight delay)
 */
export type WorkerMessage = {
  id: string;
  workerId: string;
  from: "agent" | "worker";
  content: string;
  timestamp: Date;
  read: boolean;
};

/**
 * Single step in worker execution transcript
 * Records all reasoning and tool usage for full visibility
 */
export type WorkerStep = {
  stepNumber: number;
  text?: string;
  toolCalls: Array<{
    toolName: string;
    input: unknown;
    output: unknown;
  }>;
  timestamp: Date;
};

/**
 * Pending approval request from worker
 * Worker pauses execution until main agent approves or denies
 */
export type WorkerApprovalRequest = {
  id: string;
  type: "payment" | "action";
  description: string;
  amount?: number;
  requestedAt: Date;
};

/**
 * Active worker execution running in parallel with main agent
 * Workers advance one step each time main agent takes a step
 */
export type WorkerExecution = {
  id: string;
  workerId: string;
  taskDescription: string;
  status: "running" | "waiting_approval" | "completed" | "failed";
  steps: WorkerStep[];
  currentStepNumber: number;
  maxSteps: number;
  startedAt: Date;
  completedAt: Date | null;
  result: string | null;
  cost: number;
  pendingApproval?: WorkerApprovalRequest;
  _agent?: unknown;
};

/**
 * Completed task record for historical tracking
 */
export type WorkerTask = {
  id: string;
  workerId: string;
  description: string;
  assignedDay: number;
  completedDay: number | null;
  status: "completed" | "failed";
  result: string | null;
  toolsUsed: string[];
  cost: number;
  stepCount: number;
};

/**
 * Hired worker record
 */
export type HiredWorker = {
  id: string;
  role: WorkerRole;
  name: string;
  hiredDay: number;
  firedDay: number | null;
  active: boolean;
  totalTasksCompleted: number;
  totalCostPaid: number;
};

/**
 * Worker listing for marketplace display
 */
export type WorkerListing = {
  role: WorkerRole;
  name: string;
  description: string;
  whenToHire: string;
  capabilities: string[];
  limitations: string[];
  hireFee: number;
  dailyWage: number;
  perTaskFee: number;
};

/**
 * Complete simulation state
 */
export type VendingState = {
  day: number;
  waitingForNextDay: boolean;

  balance: number;
  transactions: Transaction[];
  consecutiveDaysUnpaid: number;

  machineSlots: MachineSlot[];
  machineCash: number;

  storage: StorageItem[];
  pendingOrders: PendingOrder[];

  emails: Email[];
  processedEmailIds: Set<string>;

  scratchpad: string;
  kvStore: Record<string, string>;

  workers: HiredWorker[];
  workerMessages: WorkerMessage[];
  workerTasks: WorkerTask[];
  activeWorkerExecutions: WorkerExecution[];
};
