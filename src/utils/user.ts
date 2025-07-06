type UserDetails = {
  [key: string]: string;
};

let storedUserDetails: UserDetails | null = null;

export function logUserDetails(details: UserDetails) {
  console.log('User Details:');
  Object.entries(details).forEach(([key, value]) => {
    console.log(`${key}: ${value}`);
  });

  storedUserDetails = details;
}

export function getLoggedUserDetails(): UserDetails | null {
  return storedUserDetails;
}
