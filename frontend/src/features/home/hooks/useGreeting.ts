/**
 * useGreeting — Returns a time-based greeting and user name.
 *
 * Ready for backend: replace the hardcoded name with
 * data from the user profile API.
 */

export function useGreeting() {
  /* TODO: fetch user name from profile API */
  const name = "User";

  const hour = new Date().getHours();
  let greeting = "Good evening";
  if (hour < 12) greeting = "Good morning";
  else if (hour < 17) greeting = "Good afternoon";

  return { greeting, name };
}
