export function isDuplicateKeyValueError(e: unknown | Error): boolean {
	return (e as any).message && /duplicate key value|重複したキー値は一意性制約/.test((e as any).message);
}
