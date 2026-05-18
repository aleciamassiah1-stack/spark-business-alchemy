const fs = require('fs');
const path = require('path');

const swiftPath = path.join(
  process.cwd(),
  'node_modules/@capacitor-community/apple-sign-in/ios/Sources/SignInWithApple/Plugin.swift',
);

if (!fs.existsSync(swiftPath)) {
  console.warn('[apple-sign-in patch] Plugin.swift not found; skipping.');
  process.exit(0);
}

let source = fs.readFileSync(swiftPath, 'utf8');

if (!source.includes('import UIKit')) {
  source = source.replace('import Foundation\n', 'import Foundation\nimport UIKit\n');
}

source = source.replace(
  '        let authorizationController = ASAuthorizationController(authorizationRequests: [request])\n        authorizationController.delegate = self\n        authorizationController.performRequests()\n',
  '        let authorizationController = ASAuthorizationController(authorizationRequests: [request])\n        authorizationController.delegate = self\n        authorizationController.presentationContextProvider = self\n        authorizationController.performRequests()\n',
);

if (!source.includes('ASAuthorizationControllerPresentationContextProviding')) {
  source += `

extension SignInWithApple: ASAuthorizationControllerPresentationContextProviding {
    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        if let window = self.bridge?.viewController?.view.window {
            return window
        }

        if #available(iOS 15.0, *) {
            let scenes = UIApplication.shared.connectedScenes
            for scene in scenes {
                if let windowScene = scene as? UIWindowScene,
                   let keyWindow = windowScene.windows.first(where: { $0.isKeyWindow }) {
                    return keyWindow
                }
            }
        } else {
            if let keyWindow = UIApplication.shared.windows.first(where: { $0.isKeyWindow }) {
                return keyWindow
            }
        }

        return UIApplication.shared.windows.first ?? UIWindow(frame: UIScreen.main.bounds)
    }
}
`;
}

fs.writeFileSync(swiftPath, source);
console.log('[apple-sign-in patch] Added iOS presentation anchor for Sign in with Apple.');
