import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

interface ETradeSetupGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ETradeSetupGuide({ isOpen, onClose }: ETradeSetupGuideProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-semibold text-gray-900">
                    How to Get E*TRADE API Keys
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="rounded-full p-1 hover:bg-gray-100 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-6 text-sm text-gray-700 max-h-[70vh] overflow-y-auto pr-2">
                  {/* Intro */}
                  <p>
                    E*TRADE requires you to register as a developer and request API keys. There are two types of keys:
                    <strong> Sandbox</strong> (for testing with fake money) and <strong>Production</strong> (for real trading).
                    We recommend starting with Sandbox keys.
                  </p>

                  {/* Step 1 */}
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-semibold text-gray-900 mb-1">Step 1: Create an E*TRADE Account</h3>
                    <p>
                      If you don't already have one, sign up for an E*TRADE brokerage account at{' '}
                      <a
                        href="https://us.etrade.com/home"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        etrade.com <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                      </a>
                      . You'll need this account to access the developer portal.
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-semibold text-gray-900 mb-1">Step 2: Visit the E*TRADE Developer Portal</h3>
                    <p>
                      Go to the E*TRADE Developer Portal at{' '}
                      <a
                        href="https://developer.etrade.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        developer.etrade.com <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                      </a>
                      . Sign in with your E*TRADE account credentials.
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-semibold text-gray-900 mb-1">Step 3: Request Sandbox API Keys</h3>
                    <ol className="list-decimal list-inside space-y-2 mt-2">
                      <li>Click on <strong>"Get API Keys"</strong> or navigate to the API key management section.</li>
                      <li>Fill out the application form:
                        <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-gray-600">
                          <li><strong>App Name:</strong> Choose any name (e.g., "G2E Trading")</li>
                          <li><strong>Description:</strong> Brief description of your use case</li>
                          <li><strong>Callback URL:</strong> <code className="bg-gray-100 px-1 rounded text-xs">https://etrade-ai-trading.web.app/settings</code></li>
                        </ul>
                      </li>
                      <li>Submit the form. <strong>Sandbox keys are usually issued immediately.</strong></li>
                      <li>You'll receive a <strong>Consumer Key</strong> (also called API Key) and a <strong>Consumer Secret</strong> (also called API Secret).</li>
                    </ol>
                  </div>

                  {/* Step 4 */}
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-semibold text-gray-900 mb-1">Step 4: Save Your Sandbox Keys in G2E</h3>
                    <ol className="list-decimal list-inside space-y-2 mt-2">
                      <li>Copy the <strong>Consumer Key</strong> and paste it into the "API Key / Consumer Key" field below.</li>
                      <li>Copy the <strong>Consumer Secret</strong> and paste it into the "API Secret / Consumer Secret" field below.</li>
                      <li>Make sure <strong>"Sandbox Mode"</strong> is checked (it is by default).</li>
                      <li>Click <strong>"Save Keys"</strong>.</li>
                      <li>You can now click <strong>"Connect"</strong> on the E*TRADE broker card to start the OAuth flow.</li>
                    </ol>
                  </div>

                  {/* Step 5 */}
                  <div className="border-l-4 border-green-500 pl-4">
                    <h3 className="font-semibold text-gray-900 mb-1">Step 5: Request Production API Keys (When Ready)</h3>
                    <p className="mb-2">
                      Once you've tested with sandbox keys and want to trade with real money:
                    </p>
                    <ol className="list-decimal list-inside space-y-2">
                      <li>Return to the{' '}
                        <a
                          href="https://developer.etrade.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                          E*TRADE Developer Portal <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                        </a>
                        .
                      </li>
                      <li>Apply for <strong>Production API access</strong>.</li>
                      <li>E*TRADE will review your application. You may need to:
                        <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-gray-600">
                          <li>Sign an <strong>Individual Developer Agreement</strong></li>
                          <li>Provide details about how you'll use the API</li>
                          <li>Wait for approval (typically 1-3 business days)</li>
                        </ul>
                      </li>
                      <li>Once approved, you'll receive production Consumer Key and Secret.</li>
                      <li>Come back here, enter your production keys, and <strong>uncheck "Sandbox Mode"</strong>.</li>
                    </ol>
                  </div>

                  {/* Tips */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h3 className="font-semibold text-amber-800 mb-2">Important Notes</h3>
                    <ul className="list-disc list-inside space-y-1 text-amber-700">
                      <li>Your API keys are encrypted before being stored and are never shared with anyone.</li>
                      <li>Sandbox keys only work with E*TRADE's test environment (no real money).</li>
                      <li>Never share your Consumer Secret with anyone.</li>
                      <li>You can delete your keys at any time from this settings page.</li>
                      <li>If you have trouble, contact E*TRADE developer support at{' '}
                        <a
                          href="https://developer.etrade.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-800 underline"
                        >
                          developer.etrade.com
                        </a>
                        .
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Got it
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
