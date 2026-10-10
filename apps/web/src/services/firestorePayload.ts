/** Remove undefined from nested Firestore maps without changing Timestamp or FieldValue classes. */
export function stripUndefinedFields<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => item === undefined ? null : stripUndefinedFields(item)) as T;
  }
  if (value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(value).filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, stripUndefinedFields(item)]),
    ) as T;
  }
  return value;
}
