const LOGIN_PATH = "/login";

export const isLoginPath = (pathname: string): boolean =>
  pathname.toLowerCase() === LOGIN_PATH ||
  pathname.toLowerCase().startsWith(`${LOGIN_PATH}/`);

export const getCurrentReturnTo = (location: Location = window.location) =>
  `${location.pathname}${location.search}${location.hash}`;

/** Accept only paths on this origin and never return to the login page itself. */
export const getSafeReturnTo = (
  requested: string | null | undefined,
  origin: string = window.location.origin,
): string => {
  if (!requested) return "/";

  try {
    const destination = new URL(requested, origin);
    if (destination.origin !== origin || isLoginPath(destination.pathname)) {
      return "/";
    }
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return "/";
  }
};

