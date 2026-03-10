import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen';
import { ROUTES } from '../utils/constants';

const Stack = createNativeStackNavigator();

const AuthNavigator = ({ initialRoute }) => {
  return (
    <Stack.Navigator
      initialRouteName={initialRoute || ROUTES.LOGIN}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
      <Stack.Screen name={ROUTES.REGISTER} component={RegisterScreen} />
      <Stack.Screen name={ROUTES.PROFILE_SETUP} component={ProfileSetupScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
