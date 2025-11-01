import { HikPlayer } from '@/components/HikPlayer.tsx';

function App() {
  return (
    <div>
      <HikPlayer
        accessToken='hcc.qDkUxx1RnfVspsSxZHfcU6SWjDCz6UzZ'
        secretKey='16071991aZ'
        serialNumber='FU5068433'
        channelNumber={1}
        domain='https://isgp.hikcentralconnect.com'
        mode='live'
        storageType='local'
        onError={(err) => console.error(err)}
      />
    </div>
  );
}

export default App;
