import { HikPlayer } from '@/components/HikPlayer.tsx';
import { useState } from 'react';
import { Input } from '@/components/ui/input.tsx';

function App() {
  const [accessToken, setAccessToken] = useState(
    'at.4l44ripl2p8nsy7q10y30pek237dsn9w-7lkehmxl5g-01q0ixy-69we0io7l'
  );
  const [secretKey, setSecretKey] = useState('16071991aZ');
  const [serialNumber, setSerialNumber] = useState('FU5068433');
  const [domain, setDomain] = useState('https://isgp.hikcentralconnect.com');

  return (
    <div>
      <div className='flex items-center justify-between gap-4 p-4'>
        <Input
          placeholder='Access token'
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
        />
        <Input
          placeholder='Secret key'
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
        />
        <Input
          placeholder='Serial number'
          value={serialNumber}
          onChange={(e) => setSerialNumber(e.target.value)}
        />
        <Input placeholder='domain' value={domain} onChange={(e) => setDomain(e.target.value)} />
      </div>
      <HikPlayer
        accessToken={accessToken}
        secretKey={secretKey}
        serialNumber={serialNumber}
        channelNumber={1}
        domain={domain}
        mode='live'
        storageType='local'
        onError={(err) => console.error(err)}
      />
    </div>
  );
}

export default App;
