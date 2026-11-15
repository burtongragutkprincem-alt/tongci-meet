// Export the published P039 release into independent static hosting.
// Browser assets use only local paths; the source origin is contacted at build time only.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const origin='https://fuguang-theatre-model-p039.burtongragutkprincem.chatgpt.site/';
const files=[
  {
    "path": "app.js",
    "sha256": "feec09be7f0bb0a9842aa55d6d13260961dc05e1416480ac107a84109e3c7141"
  },
  {
    "path": "index.html",
    "sha256": "ffbe9922d7c0d7da091b5600e7b3abeda149eec20992f0b2db02ee0bfd01518e"
  },
  {
    "path": "model.json",
    "sha256": "0d402b14f1753e7233f518aefd05715ee436b5ef554481a2f08f3fbf07eab499"
  },
  {
    "path": "style.css",
    "sha256": "6ce0b54e05bf82e4815dd4585db852296cf8715f0fa248c7bc677bf7111badab"
  },
  {
    "path": "assets/favicon.svg",
    "sha256": "9404be061fdc880f1f1ec7fa47d9f9a49d49971b9bd6b3defb3811ba2a55f1d4"
  },
  {
    "path": "assets/model-5ce7d0d29c18-gzip.bin",
    "sha256": "78bb3002e7d8eb9fcd307165ba1998b6a1ff7c06b07d83ad1da7296d45bac05f"
  },
  {
    "path": "assets/model-5ce7d0d29c18-part1.bin",
    "sha256": "0c3c35bd20f4c3ec4aaf3fa7d356e308f4fbf3e8b1d152a4aeddbe72a435271c"
  },
  {
    "path": "assets/model-5ce7d0d29c18-part2.bin",
    "sha256": "76a63ae4a05ef29496a74d5a85f5e0781f98e4de30b78b7abd65d2e025b2caca"
  },
  {
    "path": "assets/model-5ce7d0d29c18-part3.bin",
    "sha256": "54013914a414d6125198de0785bd7ab2d0229d1a5cf52eccfcc4ea4131c92dce"
  },
  {
    "path": "assets/model-preview.webp",
    "sha256": "5fcabfe306bc78caad45649983a1e3a03c5bb75ac7da733279f9a44d284e846b"
  },
  {
    "path": "assets/THREE-LICENSE.txt",
    "sha256": "852e0e8699169bf9f6fdc6bda3e682d078dcbc738b5d33e74df594721bff271d"
  },
  {
    "path": "assets/three.min.js",
    "sha256": "170c6789f43217c96b3170f4b42fafe135de7f7cd48497a4218f9757ee1d49fa"
  }
];
(async()=>{for(const item of files){let lastError;for(let attempt=0;attempt<3;attempt++){try{const response=await fetch(origin+item.path,{signal:AbortSignal.timeout(120000)});if(!response.ok)throw Error('HTTP '+response.status);const data=Buffer.from(await response.arrayBuffer());if(crypto.createHash('sha256').update(data).digest('hex')!==item.sha256)throw Error('Release checksum mismatch');const target=path.join('theatre-dist',item.path);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,data);console.log('Verified '+item.path+' '+data.length+' bytes');lastError=null;break}catch(error){lastError=error;console.warn('Retry '+item.path+' '+error.message)}}if(lastError)throw lastError}console.log('Independent theatre static release ready')})().catch(e=>{console.error(e);process.exit(1)});
