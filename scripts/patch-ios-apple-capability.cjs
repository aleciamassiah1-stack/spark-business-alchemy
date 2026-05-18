const fs = require('fs');
const path = require('path');

const iosRoot = path.join(process.cwd(), 'ios', 'App');
const pbxprojPath = path.join(iosRoot, 'App.xcodeproj', 'project.pbxproj');
const entitlementsPath = path.join(iosRoot, 'App', 'App.entitlements');

if (!fs.existsSync(pbxprojPath)) {
  console.warn('[apple-capability patch] iOS project not found; skipping. Run `bun run cap:add:ios` first.');
  process.exit(0);
}

fs.mkdirSync(path.dirname(entitlementsPath), { recursive: true });

const entitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.developer.applesignin</key>
	<array>
		<string>Default</string>
	</array>
</dict>
</plist>
`;

fs.writeFileSync(entitlementsPath, entitlements);

let project = fs.readFileSync(pbxprojPath, 'utf8');

if (!project.includes('com.apple.SignInWithApple')) {
  project = project.replace(
    /(TargetAttributes = \{\s*[A-F0-9]{24} = \{)/,
    `$1\n\t\t\t\t\t\tSystemCapabilities = {\n\t\t\t\t\t\t\tcom.apple.SignInWithApple = {\n\t\t\t\t\t\t\t\tenabled = 1;\n\t\t\t\t\t\t\t};\n\t\t\t\t\t\t};`,
  );
}

if (!project.includes('CODE_SIGN_ENTITLEMENTS = App/App.entitlements;')) {
  project = project.replace(
    /(PRODUCT_BUNDLE_IDENTIFIER = co\.aetherwealth\.app;)/g,
    `CODE_SIGN_ENTITLEMENTS = App/App.entitlements;\n\t\t\t\t$1`,
  );
}

fs.writeFileSync(pbxprojPath, project);
console.log('[apple-capability patch] Enabled Sign in with Apple capability for the iOS target.');