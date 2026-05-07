export type SafeDbResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      reason: "missing-env" | "unavailable";
    };

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error);
}

export function isDatabaseUnavailableError(error: unknown): boolean {
  const message = errorMessage(error);

  return [
    "DATABASE_URL",
    "Environment variable not found",
    "PrismaClientInitializationError",
    "Prisma Client is not generated",
    "Can't reach database server",
    "P1001",
    "P1012"
  ].some((needle) => message.includes(needle));
}

export async function safeDbRead<T>(
  scope: string,
  loader: () => Promise<T>
): Promise<SafeDbResult<T>> {
  try {
    return {
      ok: true,
      data: await loader()
    };
  } catch (error) {
    console.error(`[safe-db:${scope}]`, error);

    return {
      ok: false,
      reason: isDatabaseUnavailableError(error) ? "missing-env" : "unavailable"
    };
  }
}
