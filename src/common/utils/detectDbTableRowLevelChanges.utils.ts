export function detectDbTableRowLevelChanges(oldObj: any, newObj: any): string {
  const changes: string[] = [];

  for (const key in newObj) {
    if (oldObj[key] !== newObj[key]) {
      changes.push(`${key} from ${oldObj[key]} becomes ${newObj[key]}`);
    }
  }

  return changes.join(' and ');
}
