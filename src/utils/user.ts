import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnAppOpen } from '../events/default/DefaultEvents';
type UserDetails = {
  [key: string]: string;
};
// type DeviceDetails = {
//   [key: string]: string;
// };
// let storedDeviceDetails: DeviceDetails | null = null;

let storedUserDetails: UserDetails | null = null;

export function logUserDetails(details: UserDetails) {
  console.log('User Details:');
  Object.entries(details).forEach(([key, value]) => {
    console.log(`${key}: ${value}`);
  });

  storedUserDetails = details;
}

export async function OnUserLogin(user_id: string) {
  console.log('userid from fornt end:', user_id);

  // if (!user_id) {
  //   console.warn('❌ user_id is missing. Skipping device registration.');
  //   return;
  // }
  await AsyncStorage.setItem('user_id', user_id); // ✅ Store it persistently

  console.log('user id:', user_id);
  try {
    await AsyncStorage.setItem('user_id', user_id); // ✅ Store it persistently
  } catch (err) {
    console.error('❌ Failed to store user_id:', err);
  }
  // const device_id = localStorage.getItem('device_id');
  const device_id = await AsyncStorage.getItem('device_id');
  const userID = await AsyncStorage.getItem('user_id');

  console.log('device id:, ', device_id);

  if (!device_id) {
    console.warn('❌ Device ID not available.');
    return;
  }

  console.log('Logged in w device id:', device_id);

  const payload = {
    device_id,
    user_id: userID,
    channel_id: 'demo_1754408042569',
  };

  fetch('https://demo.pushapp.co.in/pushapp/api/register/user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log('Log in successfully:', data);
      OnAppOpen();
    })
    .catch((error) => {
      console.warn('❌ Error registering device:', error);
    });
}

export async function OnUserLogOut(user_id: string) {
  console.log('userid from fornt end:', user_id);
  // if (!user_id) {
  //   console.warn('❌ user_id is missing. Skipping device registration.');
  //   return;
  // }
  const userID = await AsyncStorage.getItem('user_id');

  const device_id = await AsyncStorage.getItem('device_id');
  if (!device_id) {
    console.warn('❌ Device ID not available.');
    return;
  }

  console.log('✅ Device is being registered with ID:', device_id);

  const payload = {
    device_id,
    user_id: userID,
    channel_id: 'demo_1754408042569',
  };

  fetch('https://demo.pushapp.co.in/pushapp/api/register/logout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log('Logged out successfully:', data);
    })
    .catch((error) => {
      console.warn('❌ Error registering device:', error);
    });
}
export function getLoggedUserDetails(): UserDetails | null {
  return storedUserDetails;
}
