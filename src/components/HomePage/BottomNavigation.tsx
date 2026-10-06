import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BOTTOM_TABS } from "@/components/HomePage/BottomTabs";
import {View,TouchableOpacity,Text} from 'react-native';
import { styles } from "./Styles";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "./Colors";
export function BottomNavigation({state,navigation}:BottomTabBarProps){
    const currentRouteName = state.routes[state.index].name;
    return(
        <View style={styles.tabBar}>
        {BOTTOM_TABS.map((tab) => {
          const active = tab.key.toLowerCase()===currentRouteName.toLowerCase();
          const handlePress = () => {
          // Prevent re-navigating to the same active screen
          if (!active) {
            // Capitalize or match the exact Screen name configured in your Tab.Navigator
           
            navigation.navigate(tab.key);
          }
        };
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => handlePress()}
            >
              <Ionicons
                name={tab.icon}
                size={22}
                color={active ? COLORS.pink : COLORS.inkLight}
              />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    )
}