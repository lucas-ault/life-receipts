export function shouldRunScheduledPrint(input: {
  enabled: boolean;
  hasPrinter: boolean;
  nowMinutes: number;
  printMinutes: number;
  alreadySucceeded: boolean;
  jobInProgress: boolean;
}) {
  if (!input.enabled || !input.hasPrinter) return false;
  if (input.alreadySucceeded || input.jobInProgress) return false;
  return input.nowMinutes >= input.printMinutes;
}
