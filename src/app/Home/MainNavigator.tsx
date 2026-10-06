// src/navigation/MainNavigator.tsx
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "./HomeScreen";

import CartScreen from "../Cart/CartScreen";
import ProfileScreen from "../Profile/ProfileScreen";
import OrdersScreen from "../Orders/OrdersScreen";
import { BottomNavigation } from "@/components/HomePage/BottomNavigation";
import { useEffect, useState } from "react";
import api from "@/api/api";


export type MainTabParamList = {
  Home: undefined;
  Orders:undefined;
  Cart: undefined;
  Profile: undefined;

};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainNavigator() {
  const [name,setName]=useState<string>("");
  useEffect(()=>{
    const fetchName=async()=>{
      try{
      const response=await api.get("/cust/name");
      setName(response.data);
      }
      catch(error:any){
        alert("Server Error")
      }
    }
    fetchName()

  },[])
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomNavigation {...props} />}
      screenOptions={{
        headerShown: false, // Set to true or pass custom header if needed
      }}
    >
      <Tab.Screen name="Home"  >{(props)=><HomeScreen
            {...props} // Spreads standard navigation & route props
            name={name}
          />}</Tab.Screen>
      <Tab.Screen name="Cart" component={CartScreen} />
      <Tab.Screen name="Orders" component={OrdersScreen}/>
      <Tab.Screen name="Profile" component={ProfileScreen} />
      
    </Tab.Navigator>
  );
}