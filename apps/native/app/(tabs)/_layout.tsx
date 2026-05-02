import { Tabs } from 'expo-router'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Svg, Path, Circle, Line } from 'react-native-svg'

function HomeIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <Path d="M9 22V12h6v10" />
    </Svg>
  )
}

function GroupsIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <Circle cx={9} cy={7} r={4} />
      <Path d="M23 21v-2a4 4 0 00-3-3.87" />
      <Path d="M16 3.13a4 4 0 010 7.75" />
    </Svg>
  )
}

function FriendsIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill={color} stroke="none">
      <Path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </Svg>
  )
}

function ProfileIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <Circle cx={12} cy={7} r={4} />
    </Svg>
  )
}

function PlusIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round">
      <Line x1={12} y1={5} x2={12} y2={19} />
      <Line x1={5} y1={12} x2={19} y2={12} />
    </Svg>
  )
}

// Custom tab bar with the raised center Create button
function CustomTabBar({ state, descriptors, navigation }: { state: any; descriptors: any; navigation: any }) {
  const insets = useSafeAreaInsets()

  const tabs = [
    { name: 'dashboard', label: 'Home', Icon: HomeIcon },
    { name: 'groups', label: 'Groups', Icon: GroupsIcon },
    null, // placeholder for center button
    { name: 'friends', label: 'Friends', Icon: FriendsIcon },
    { name: 'profile', label: 'Profile', Icon: ProfileIcon },
  ]

  const ACCENT = '#7c3aed'
  const INACTIVE = '#52525b'

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.bar}>
        {tabs.map((tab, i) => {
          if (!tab) {
            // Center create button
            return (
              <View key="create" style={styles.centerWrapper}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('create-event')}
                  style={styles.createButton}
                  activeOpacity={0.8}
                >
                  <PlusIcon />
                </TouchableOpacity>
              </View>
            )
          }

          const route = state.routes.find((r: { name: string }) => r.name === tab.name)
          const isFocused = route && state.index === state.routes.indexOf(route)
          const color = isFocused ? ACCENT : INACTIVE

          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => navigation.navigate(tab.name)}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <tab.Icon color={color} />
              <View style={[styles.label]}>
                <View>
                  {/* label text — using inline Text instead of className due to svg context */}
                </View>
              </View>
              {isFocused && <View style={[styles.dot, { backgroundColor: ACCENT }]} />}
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(24, 24, 27, 0.95)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#3f3f46',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 3,
  },
  centerWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20, // raises above bar
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  label: {
    height: 0, // labels handled separately if needed
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
})

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="groups" />
      <Tabs.Screen name="friends" />
      <Tabs.Screen name="profile" />
    </Tabs>
  )
}
