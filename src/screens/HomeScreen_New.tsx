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
const { AppUninstaller, AppControl } = NativeModules;

interface AppInfo {
  appName: string;
  packageName: string;
  icon: string;
}

const { height, width } = Dimensions.get('window');
function HomeScreenNew() {
  const [allApps, setAllApps] = useState<AppInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDisableApp, setIsDisable] = useState(false);
  const [q, setQ] = useState('');

  const PATTERN = [0, 30, 40, 30];
  const HEADER_HEIGHT = 200;

  const scheme = useColorScheme();
  const isDarkMode = scheme === 'dark';
  const textColor = isDarkMode ? '#fff' : '#000';

  const [adminPkgs, setAdminPkgs] = useState<Record<string, boolean>>({});
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>({});

  const markEnabled = (pkg: string, enable: boolean) =>
    setEnabledMap((m) => ({ ...m, [pkg]: enable }));

  const loadAdminFlags = async (apps: AppInfo[]) => {
    const updates: Record<string, boolean> = {};
    await Promise.all(
      apps.map(async (a) => {
        try {
          const admins = await AppControl.listActiveAdmins(a.packageName);
          updates[a.packageName] = Array.isArray(admins) && admins.length > 0;
        } catch {
          updates[a.packageName] = false;
        }
      })
    );
    setAdminPkgs((prev) => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    if (allApps.length) loadAdminFlags(allApps);
  }, [allApps]);

  useEffect(() => {
    getAllApps();
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

  const showToast = (massage: string) => {
    return ToastAndroid.showWithGravity(
      `${massage}`,
      ToastAndroid.LONG,
      ToastAndroid.CENTER
    );
  };

  const handleAppControl = async (packageName: string, enable: boolean) => {
    try {
      const res = await AppControl.toggleApp(packageName, enable);
      console.log('toggleApp', packageName, enable, res);

      markEnabled(packageName, enable);

      if (res?.status === 'ok') {
        showToast(`App ${enable ? 'enabled' : 'disabled'} request sent`);
      } else if (res?.status === 'info') {
        showToast(res?.message || 'Action attempted');
      } else {
        showToast(`Result: ${JSON.stringify(res)}`);
      }
    } catch (e) {
      console.error('Error in handleAppControl', e);
      showToast('Toggle failed');
    }
  };

  const handleDeactivateAndUninstall = async (packageName: string) => {
    try {
      const res = await AppControl.deactivateAdminsAndUninstall(packageName);
      console.log('deactivateAdminsAndUninstall', res);
      showToast(res?.message || 'Opened uninstall UI');

      setTimeout(
        () =>
          loadAdminFlags([{ appName: '', packageName, icon: '' } as AppInfo]),
        1000
      );
    } catch (e) {
      console.error('deactivate+uninstall failed', e);
      showToast('Deactivate & uninstall failed');
    }
  };

  const handleShareApp = async ({
    appName,
    packageName,
  }: {
    appName: string;
    packageName: string;
  }) => {
    try {
      let response = await AppUninstaller.shareApp(packageName);
      console.log('Share Response', response);
      if (response) {
        showToast(`${appName} Share Success!`);
      }
    } catch (error) {
      console.log('Error', error);
    }
  };

  // ===================================== List Components Here =====================================
  const listItems = (item: AppInfo) => {
    const isAdmin = !!adminPkgs[item.packageName];
    const enabled = enabledMap[item.packageName] ?? true; // default assume enabled

    return (
      <Pressable
        onLongPress={() => {
          Vibration.vibrate(50);
          Alert.alert('Share App', `Do you want to share ${item.appName}?`, [
            { text: 'Share', onPress: () => handleShareApp(item) },
            { text: 'Cancel', style: 'cancel' },
          ]);
        }}
        style={({ pressed }) => [
          styles.appItem,
          pressed && {
            backgroundColor: isDarkMode ? '#30303081' : '#bfbfbf81',
          },
        ]}>
        <View>
          <Image source={{ uri: item.icon }} style={styles.icon} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.appName, { color: textColor }]}>
              {item.appName}{' '}
              {isAdmin && (
                <Text style={{ color: '#e53935', fontSize: 12 }}>(Admin)</Text>
              )}
            </Text>
            <Text
              style={[
                styles.packageName,
                { color: isDarkMode ? '#aaa' : '#666' },
              ]}>
              {item.packageName}
            </Text>
          </View>
        </View>

        <View
          style={{
            // flexDirection: 'column',
            // alignItems: 'center',
            // justifyContent: 'space-between',
          }}>
          {/* Toggle Enable/Disable */}
          {/* Toggle Enable/Disable */}
          <Pressable
            onPress={() => handleAppControl(item.packageName, !enabled)}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: enabled ? '#444' : '#2e7d32' },
              pressed && { opacity: 0.8 }
            ]}
            android_ripple={{ color: '#ffffff33' }}>
            <Text style={{ color: '#fff' }}>
              {enabled ? 'Disable' : 'Enable'}
            </Text>
          </Pressable>

          {/* Deactivate Admin & Uninstall */}
          <Pressable
            onPress={() => handleDeactivateAndUninstall(item.packageName)}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: '#e65100' },
              pressed && { opacity: 0.8 }
            ]}
            android_ripple={{ color: '#ffffff33' }}>
            <Text style={{ color: '#fff' }}>Deact+Uninst</Text>
          </Pressable>

          {/* Plain Uninstall */}
          <Pressable
            onPress={() => handleUninstall(item.packageName)}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: '#e80000ff' },
              pressed && { backgroundColor: '#ffcccc' }
            ]}
            android_ripple={{ color: 'red' }}
            accessibilityLabel={`Uninstall ${item.appName}`}>
            <Text style={{ color: '#fff' }}>Uninstall</Text>
          </Pressable>

        </View>
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
          height: height - HEADER_HEIGHT,
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
    width: width - 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  button: {
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6
  }
});

export default HomeScreenNew;
