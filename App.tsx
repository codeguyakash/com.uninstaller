import { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Button,
  Alert,
  Image,
  useColorScheme,
} from 'react-native';
import { NativeModules } from 'react-native';
const { AppUninstaller } = NativeModules;

interface AppInfo {
  appName: string;
  packageName: string;
  icon: string;
}

function App() {
  const [apps, setApps] = useState<AppInfo[]>([]);

  const scheme = useColorScheme();
  console.log(scheme, 'Scheme');

  const fetchApps = async () => {
    try {
      let packageList = await AppUninstaller.getInstalledApps();
      console.log(packageList);
      packageList = packageList.filter(
        (app: any) => app.icon && app.packageName !== 'com.uninstaller',
      );
      setApps(packageList);
    } catch (error) {
      console.error('Error fetching apps:', error);
    }
  };
  useEffect(() => {
    fetchApps();
  }, []);

  const handleUninstall = async (packageName: string) => {
    console.log(packageName);
    Alert.alert(
      'Confirm Uninstall',
      `Are you sure you want to uninstall ${packageName}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'OK',
          onPress: async () => {
            try {
              let re = await AppUninstaller.uninstallApp(packageName);
              console.log('Res', re);
              console.log(packageName);
            } catch (error) {
              console.error('Error uninstalling app:', error);
            }
          },
        },
      ],
    );
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: scheme === 'dark' ? '#000' : '#fff' },
      ]}
    >
      <Text
        style={[styles.heading, { color: scheme === 'dark' ? '#fff' : '#000' }]}
      >
        Installed Apps: ({apps.length})
      </Text>
      <FlatList
        data={apps}
        keyExtractor={item => item?.packageName}
        renderItem={({ item }) => (
          <View style={styles.appItem}>
            <Image source={{ uri: item?.icon }} style={styles.icon} />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.appName,
                  { color: scheme === 'dark' ? '#fff' : '#000' },
                ]}
              >
                {item?.appName}
              </Text>
              <Text
                style={[
                  styles.packageName,
                  { color: scheme === 'dark' ? '#aaa' : '#666' },
                ]}
              >
                {item?.packageName}
              </Text>
            </View>
            <Button
              title="Uninstall"
              onPress={() => handleUninstall(item.packageName)}
              color="red"
              accessibilityLabel={`Uninstall ${item.appName}`}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  appItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  appName: {
    fontSize: 16,
    fontWeight: '500',
  },
  packageName: {
    fontSize: 12,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 10,
  },
});

export default App;
