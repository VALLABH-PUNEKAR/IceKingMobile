import {View,Text,TouchableOpacity} from 'react-native'
import {styles} from "@/components/HomePage/Styles";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/components/HomePage/Colors";
interface HeaderParam{
    name:string;
    scale:(size:number)=>number;
    


}
function Header({name,scale}:HeaderParam){
    return(
        <View style={styles.header}>
          <View>
            <Text style={[styles.greetingSmall, { fontSize: scale(13) }]}>Hey there 👋</Text>
            <Text style={[styles.greetingName, { fontSize: scale(21) }]}>{name}!</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="notifications-outline" size={20} color={COLORS.ink} />
            </TouchableOpacity>
            
          </View>
        </View>
    )

}
export default Header