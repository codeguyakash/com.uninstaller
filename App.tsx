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
} from 'react-native';
import { NativeModules } from 'react-native';
const { AppUninstaller } = NativeModules;

interface AppInfo {
  appName: string;
  packageName: string;
  icon: string;
}

function App() {
  const [allApps, setAllApps] = useState<AppInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [q, setQ] = useState('');

  const scheme = useColorScheme();

  useEffect(() => {
    (async () => {
      try {
        let packageList = await AppUninstaller.getInstalledApps();
        packageList = packageList.filter(
          (app: any) => app.icon && app.packageName !== 'com.uninstaller',
        );
        setAllApps(packageList);
      } catch (error) {
        console.error('Error fetching apps:', error);
      }
    })();
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setQ(searchQuery.trim().toLowerCase()), 150);
    return () => clearTimeout(id);
  }, [searchQuery]);

  const filteredApps = useMemo(() => {
    if (!q) return allApps;
    return allApps.filter(app => {
      const name = app.appName?.toLowerCase() ?? '';
      const pkg = app.packageName?.toLowerCase() ?? '';
      return name.includes(q) || pkg.includes(q);
    });
  }, [allApps, q]);

  const handleUninstall = (packageName: string) => {
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
      ],
    );
  };

  const handleShareApp = (packageName: string) => {
    AppUninstaller.shareApp(packageName)
      .then(() => console.log('App shared successfully'))
      .catch((err: any) => console.error(err));
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
        Installed Apps: ({filteredApps.length})
      </Text>

      <TextInput
        placeholder="Search by package or name"
        value={searchQuery}
        onChangeText={setSearchQuery}
        autoCorrect={false}
        autoCapitalize="none"
        style={[
          styles.input,
          {
            color: scheme === 'dark' ? '#fff' : '#000',
            backgroundColor: scheme === 'dark' ? '#111' : '#fafafa',
            borderColor: scheme === 'dark' ? '#333' : '#ddd',
          },
        ]}
      />

      <FlatList
        data={filteredApps}
        keyExtractor={item => item.packageName}
        initialNumToRender={20}
        windowSize={8}
        renderItem={({ item }) => (
          <Pressable
            onLongPress={() => {
              Vibration.vibrate(50);
              Alert.alert(
                'Share App',
                `Do you want to share ${item.appName}?`,
                [
                  {
                    text: 'Share',
                    onPress: () => handleShareApp(item.packageName),
                  },
                  { text: 'Cancel', style: 'cancel' },
                ],
              );
            }}
            style={({ pressed }) => [
              styles.appItem,
              pressed && {
                backgroundColor: scheme === 'dark' ? '#5f5f5f66' : '#e6e6e6',
              },
            ]}
          >
            <Image source={{ uri: item.icon }} style={styles.icon} />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.appName,
                  { color: scheme === 'dark' ? '#fff' : '#000' },
                ]}
              >
                {item.appName}
              </Text>
              <Text
                style={[
                  styles.packageName,
                  { color: scheme === 'dark' ? '#aaa' : '#666' },
                ]}
              >
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
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40, paddingHorizontal: 16 },
  heading: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  appItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  appName: { fontSize: 16, fontWeight: '500' },
  packageName: { fontSize: 12 },
  icon: { width: 40, height: 40, borderRadius: 8, marginRight: 10 },
  input: { borderWidth: 1, borderRadius: 4, padding: 8, marginBottom: 12 },
});

export default App;
