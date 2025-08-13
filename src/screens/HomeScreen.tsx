import { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Button,
  Alert,
  Image,
  useColorScheme,
  TextInput,
  Pressable,
  Vibration,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  ToastAndroid,
} from 'react-native';
import { NativeModules } from 'react-native';
const { AppUninstaller } = NativeModules;

interface AppInfo {
  appName: string;
  packageName: string;
  icon: string;
}

const { height, width } = Dimensions.get('window');
function HomeScreen() {
  const [allApps, setAllApps] = useState<AppInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [q, setQ] = useState('');

  const ONE_SECOND_IN_MS = 1000;
  const PATTERN: number[] = [1 * ONE_SECOND_IN_MS];
  const HEADER_HIGHT = 200;

  const scheme = useColorScheme();
  const isDarkMode = scheme === 'dark';
  const textColor = isDarkMode ? '#fff' : '#000';

  useEffect(() => {
    getAllApps();
    console.log(ToastAndroid);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setQ(searchQuery.trim().toLowerCase()), 150);
    return () => clearTimeout(id);
  }, [searchQuery]);

  const filteredApps = useMemo(() => {
    if (!q) return allApps;
    return allApps.filter((app) => {
      const name = app.appName?.toLowerCase() ?? '';
      const pkg = app.packageName?.toLowerCase() ?? '';
      return name.includes(q) || pkg.includes(q);
    });
  }, [allApps, q]);

  const getAllApps = async () => {
    try {
      let packageList = await AppUninstaller.getInstalledApps();
      setAllApps(packageList);
    } catch (error) {
      console.error('Error fetching apps:', error);
    }
  };

  const handleUninstall = (packageName: string) => {
    if (packageName === 'com.uninstaller') {
      Alert.alert(
        "Can't Uninstall",
        'this is main app which list all installed apps'
      );
      return;
    }
    Alert.alert(
      'Confirm Uninstall',
      `Are you sure you want to uninstall ${packageName}?`,
      [
        {
          text: 'Uninstall',
          onPress: async () => {
            try {
              await AppUninstaller.uninstallApp(packageName);
            } catch (error) {
              console.error('Error uninstalling app:', error);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleShareApp = async (packageName: string) => {
    try {
      let response = await AppUninstaller.shareApp(packageName);
      console.log('Share Response', response);
      if (response) {
        ToastAndroid.showWithGravity(
          `${packageName} Share Successfully`,
          20,
          1
        );
      }
    } catch (error) {
      console.log('Error', error);
    }
  };

  // ===================================== List Components Here =====================================
  const listItems = (item: any) => {
    return (
      <Pressable
        onLongPress={() => {
          Vibration.vibrate(PATTERN);
          console.log('Long Pressed');
          Alert.alert('Share App', `Do you want to share ${item.appName}?`, [
            {
              text: 'Share',
              onPress: () => handleShareApp(item.packageName),
            },
            { text: 'Cancel', style: 'cancel' },
          ]);
        }}
        style={({ pressed }) => [
          styles.appItem,
          pressed && {
            backgroundColor: isDarkMode ? '#30303081' : '#bfbfbf81',
          },
        ]}>
        <Image source={{ uri: item.icon }} style={styles.icon} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.appName, { color: textColor }]}>
            {item.appName}
          </Text>
          <Text
            style={[
              styles.packageName,
              { color: isDarkMode ? '#aaa' : '#666' },
            ]}>
            {item.packageName}
          </Text>
        </View>
        <Button
          title="Uninstall"
          onPress={() => handleUninstall(item.packageName)}
          color="red"
          accessibilityLabel={`Uninstall ${item.appName}`}
        />
      </Pressable>
    );
  };
  const listFooter = () => {
    return (
      <Text
        style={[
          styles.heading,
          { color: textColor, textAlign: 'center', fontSize: 14 },
        ]}>
        @codeguyakash
      </Text>
    );
  };
  const listEmpty = () => {
    return (
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          height: height - HEADER_HIGHT,
        }}>
        <ActivityIndicator size="large" color="red" />
      </View>
    );
  };
  // ===================================== List Components Here =====================================

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDarkMode ? '#000' : '#fff',
        },
      ]}>
      <View>
        <Text style={[styles.heading, { color: textColor }]}>
          Installed Apps : ({filteredApps.length})
        </Text>
        <View>
          <TextInput
            placeholder="Search by package or name"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
            style={[
              styles.input,
              {
                color: textColor,
                backgroundColor: isDarkMode ? '#000' : '#fff',
                borderColor: isDarkMode ? '#333' : '#ddd',
              },
            ]}
          />
          <Text
            onPress={() => setSearchQuery('')}
            style={{
              color: textColor,
              position: 'absolute',
              top: 8,
              right: 10,
            }}>
            Clear
          </Text>
        </View>
      </View>
      <FlatList
        data={filteredApps}
        keyExtractor={(item) => item.packageName}
        initialNumToRender={20}
        windowSize={8}
        ListHeaderComponent={null}
        renderItem={({ item }) => listItems(item)}
        ListFooterComponent={listFooter}
        ListEmptyComponent={listEmpty}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: StatusBar.currentHeight,
    paddingHorizontal: 16,
  },
  heading: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  appItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 0.2,
    borderBottomColor: '#888888ff',
  },
  appName: { fontSize: 16, fontWeight: '500' },
  packageName: { fontSize: 12 },
  icon: { width: 40, height: 40, borderRadius: 8, marginRight: 10 },
  input: { borderWidth: 1, borderRadius: 4, padding: 8, marginBottom: 12 },
});

export default HomeScreen;
