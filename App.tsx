import 'react-native-url-polyfill/auto';
import { registerRootComponent } from 'expo';
import React from 'react'
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';


import LoginScreen from '@/app/login/LoginScreen';
import MainNavigator from '@/app/Home/MainNavigator';
import RegisterScreen from '@/app/Register/RegisterScreen';
import ViewProductScreen from '@/app/Products/ViewProductScreen';
import type { Flavor } from '@/components/Flavor';
// 1. Define the type list for your screen routes
export type RootStackParamList = {
  Login: undefined; // Screen has no route parameters
  Main:undefined;
  SignUp:undefined;
  Product:{product:Flavor};
   // Screen accepts optional parameters
};
// 2. Pass the ParamList to the stack navigator
const Stack = createNativeStackNavigator<RootStackParamList>();
export default function App(){
    return(
        <NavigationContainer>
            <Stack.Navigator initialRouteName="Login">
                <Stack.Screen name="Login" component={LoginScreen}/>
                <Stack.Screen name="Main" component={MainNavigator}/>
                <Stack.Screen name="SignUp" component={RegisterScreen}/>
                <Stack.Screen name="Product" component={ViewProductWrapper}/>
            </Stack.Navigator>
            
        </NavigationContainer>

    )

}
function ViewProductWrapper({ route, navigation }: any) {
  const { product } = route.params;
  return (
    <ViewProductScreen
      product={product}
      navigation={navigation}
      onAddToCart={(item, qty) => {
        // Handle global cart logic if applicable
      }}
    />
  );
}
registerRootComponent(App);