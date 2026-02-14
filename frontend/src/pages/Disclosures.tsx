import { Card, Title, Text } from '@tremor/react';
import { useTheme } from '../contexts/ThemeContext';

export function Disclosures() {
  const { theme } = useTheme();

  const headingClass = `text-lg font-semibold mt-6 mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`;
  const subheadingClass = `text-base font-medium mt-4 mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`;
  const paragraphClass = `text-sm leading-relaxed mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`;
  const listClass = `text-sm leading-relaxed mb-3 ml-5 list-disc space-y-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <Title className={theme === 'dark' ? 'text-white' : ''}>Disclosures & Legal</Title>
        <Text className={theme === 'dark' ? 'text-gray-400' : ''}>
          Important legal information, risk disclosures, and terms governing your use of G2E Trading.
        </Text>
      </div>

      <Card className={theme === 'dark' ? 'bg-[#161b22]' : ''}>
        <Text className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
          Last Updated: February 14, 2026
        </Text>

        {/* ------------------------------------------------------------------ */}
        {/* 1. Terms of Use / Agreement */}
        {/* ------------------------------------------------------------------ */}
        <h2 className={headingClass}>1. Terms of Use</h2>

        <p className={paragraphClass}>
          These Terms of Use ("Terms") constitute a legally binding agreement between you ("User,"
          "you," or "your") and G2E Technologies ("G2E," "we," "us," or "our"), governing your
          access to and use of the G2E Trading platform, including its website, application
          programming interfaces, mobile and web applications, and all related services
          (collectively, the "Platform").
        </p>
        <p className={paragraphClass}>
          By creating an account, accessing, or using any part of the Platform, you acknowledge
          that you have read, understood, and agree to be bound by these Terms in their entirety.
          If you do not agree with any provision of these Terms, you must immediately discontinue
          use of the Platform.
        </p>
        <p className={paragraphClass}>
          G2E Technologies reserves the right to modify, amend, or update these Terms at any time
          and at its sole discretion. Continued use of the Platform following the posting of
          revised Terms constitutes your acceptance of such changes. It is your responsibility to
          review these Terms periodically for updates.
        </p>
        <p className={paragraphClass}>
          You represent and warrant that you are at least 18 years of age (or the age of majority
          in your jurisdiction) and possess the legal authority to enter into these Terms.
        </p>

        {/* ------------------------------------------------------------------ */}
        {/* 2. AI-Generated Content Disclaimer */}
        {/* ------------------------------------------------------------------ */}
        <h2 className={headingClass}>2. AI-Generated Content Disclaimer</h2>

        <p className={paragraphClass}>
          The Platform utilizes artificial intelligence technology, including Google Gemini large
          language models, to generate market analysis, trading ideas, research summaries,
          strategy evaluations, and other content ("AI-Generated Content"). You acknowledge and
          agree to the following:
        </p>
        <ul className={listClass}>
          <li>
            AI-Generated Content is produced by machine learning algorithms and is inherently
            probabilistic. It may contain errors, inaccuracies, omissions, outdated information,
            or conclusions that are incomplete or incorrect.
          </li>
          <li>
            AI-Generated Content does not constitute personalized investment advice, a
            recommendation to buy, sell, or hold any security, or a solicitation to engage in any
            transaction.
          </li>
          <li>
            The AI models powering the Platform do not have access to your complete financial
            situation, risk tolerance, investment objectives, tax circumstances, or other factors
            that a qualified financial professional would consider before making a recommendation.
          </li>
          <li>
            Past performance data referenced in AI-Generated Content is not indicative of future
            results. Market conditions change, and historical patterns may not repeat.
          </li>
          <li>
            You are solely responsible for evaluating the accuracy, completeness, and usefulness
            of any AI-Generated Content and for any investment decisions you make based on such
            content.
          </li>
          <li>
            G2E Technologies does not guarantee the accuracy, reliability, completeness, or
            timeliness of any AI-Generated Content and expressly disclaims all liability arising
            from reliance on such content.
          </li>
        </ul>

        {/* ------------------------------------------------------------------ */}
        {/* 3. Investment Risk Disclosures */}
        {/* ------------------------------------------------------------------ */}
        <h2 className={headingClass}>3. Investment Risk Disclosures</h2>

        <p className={paragraphClass}>
          Investing in securities, including stocks, options, exchange-traded funds, and other
          financial instruments, involves substantial risk of loss, including the potential loss
          of your entire invested capital. You should carefully consider whether trading or
          investing is appropriate for you in light of your financial condition and objectives.
        </p>

        <h3 className={subheadingClass}>General Market Risks</h3>
        <ul className={listClass}>
          <li>
            <strong>Market risk:</strong> The value of securities may fluctuate significantly due
            to economic, political, regulatory, or market developments, including factors beyond
            anyone's control or prediction.
          </li>
          <li>
            <strong>Liquidity risk:</strong> Some securities may be difficult to sell quickly at a
            fair price, particularly during periods of market stress or low trading volume.
          </li>
          <li>
            <strong>Volatility risk:</strong> Securities prices can experience rapid and
            unpredictable changes. Short-term volatility can result in significant losses, even
            for securities with strong long-term fundamentals.
          </li>
          <li>
            <strong>Concentration risk:</strong> Investing a disproportionate amount in a single
            security, sector, or asset class increases exposure to adverse events affecting that
            area.
          </li>
          <li>
            <strong>Currency and geopolitical risk:</strong> International investments are subject
            to fluctuations in foreign exchange rates and may be affected by political instability,
            sanctions, or trade disputes.
          </li>
        </ul>

        <h3 className={subheadingClass}>Options and Leveraged Products</h3>
        <p className={paragraphClass}>
          Options trading involves significant risk and is not appropriate for all investors. The
          risk of loss in trading options can be substantial. Before trading options, you should
          read the document "Characteristics and Risks of Standardized Options" published by The
          Options Clearing Corporation (OCC). Leveraged and inverse products may lose
          significantly more than the initial investment and are generally designed for short-term
          trading, not long-term holding.
        </p>

        <h3 className={subheadingClass}>No Guarantee of Returns</h3>
        <p className={paragraphClass}>
          There is no guarantee that any investment strategy, analysis, or recommendation presented
          through the Platform will result in profits or avoid losses. All investments carry risk,
          and you should be prepared to lose some or all of your invested capital.
        </p>

        {/* ------------------------------------------------------------------ */}
        {/* 4. No Investment Advice Disclaimer */}
        {/* ------------------------------------------------------------------ */}
        <h2 className={headingClass}>4. No Investment Advice / Regulatory Disclaimer</h2>

        <p className={paragraphClass}>
          G2E Technologies is a technology company that provides software tools for informational
          and educational purposes only. <strong>G2E Technologies is not a registered
          investment adviser, broker-dealer, or financial planner.</strong> The Platform is not
          registered with, nor is it subject to oversight by, the U.S. Securities and Exchange
          Commission (SEC), the Financial Industry Regulatory Authority (FINRA), or any other
          federal, state, or foreign financial regulatory authority in any capacity that would
          require it to provide investment advice.
        </p>
        <p className={paragraphClass}>
          Nothing on the Platform should be construed as (a) an offer or solicitation to buy or
          sell any security or financial instrument; (b) investment advice or a recommendation
          regarding any security, investment strategy, or course of action; (c) tax, legal, or
          accounting advice; or (d) a representation that any investment or strategy is suitable
          or appropriate for your particular circumstances.
        </p>
        <p className={paragraphClass}>
          You should consult with a qualified, licensed financial advisor, tax professional, or
          other appropriate expert before making any investment decisions. Reliance on any
          information provided by the Platform, its employees, affiliates, or third parties is
          solely at your own risk.
        </p>
        <p className={paragraphClass}>
          The information provided on the Platform is not intended for distribution to, or use by,
          any person in any jurisdiction where such distribution or use would be contrary to
          applicable law or regulation.
        </p>

        {/* ------------------------------------------------------------------ */}
        {/* 5. Third-Party Data & Brokerage Integration */}
        {/* ------------------------------------------------------------------ */}
        <h2 className={headingClass}>5. Third-Party Data & Brokerage Integrations</h2>

        <p className={paragraphClass}>
          The Platform may integrate with third-party brokerage services, including but not limited
          to E*TRADE (Morgan Stanley) and Alpaca Markets, to facilitate account connectivity,
          portfolio viewing, and order execution (collectively, "Brokerage Integrations"). You
          acknowledge and agree to the following:
        </p>
        <ul className={listClass}>
          <li>
            Brokerage Integrations are provided on an "as-is" and "as-available" basis. G2E
            Technologies does not warrant that integrations will be uninterrupted, error-free,
            secure, or free of latency, delays, or data inaccuracies.
          </li>
          <li>
            G2E Technologies is not affiliated with, endorsed by, or sponsored by any third-party
            brokerage. Your relationship with your brokerage is governed solely by the terms and
            agreements between you and that brokerage.
          </li>
          <li>
            You are solely responsible for reviewing and complying with the terms of service,
            privacy policies, and customer agreements of any brokerage with which you connect
            through the Platform.
          </li>
          <li>
            Market data, portfolio valuations, account balances, and other information obtained
            through Brokerage Integrations may be delayed, incomplete, or inaccurate. You should
            verify all such information directly with your brokerage before taking action.
          </li>
          <li>
            G2E Technologies is not responsible for any orders placed, executed, or failed through
            Brokerage Integrations. You bear full responsibility for all trading decisions and
            activity conducted through your brokerage account, regardless of whether such activity
            was initiated through the Platform.
          </li>
          <li>
            API credentials and OAuth tokens provided by your brokerage are stored securely using
            industry-standard encryption. However, no method of electronic storage is 100% secure,
            and G2E Technologies cannot guarantee absolute security of your credentials.
          </li>
          <li>
            Third-party brokerage APIs may change, become unavailable, or be discontinued without
            notice. G2E Technologies is not liable for any loss of functionality resulting from
            such changes.
          </li>
        </ul>

        {/* ------------------------------------------------------------------ */}
        {/* 6. Limitation of Liability */}
        {/* ------------------------------------------------------------------ */}
        <h2 className={headingClass}>6. Limitation of Liability</h2>

        <p className={paragraphClass}>
          TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, G2E TECHNOLOGIES, ITS OFFICERS,
          DIRECTORS, EMPLOYEES, AGENTS, AFFILIATES, LICENSORS, AND SERVICE PROVIDERS
          (COLLECTIVELY, THE "G2E PARTIES") SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
          SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO
          DAMAGES FOR LOSS OF PROFITS, REVENUE, GOODWILL, DATA, OR OTHER INTANGIBLE LOSSES,
          ARISING OUT OF OR IN CONNECTION WITH:
        </p>
        <ul className={listClass}>
          <li>Your use of or inability to use the Platform;</li>
          <li>Any AI-Generated Content, analysis, recommendation, or other output of the Platform;</li>
          <li>
            Any investment decision made, or action taken or not taken, in reliance on information
            provided by the Platform;
          </li>
          <li>
            Unauthorized access to or alteration of your data, transmissions, or account
            credentials;
          </li>
          <li>
            Errors, interruptions, delays, or inaccuracies in data provided through the Platform
            or Brokerage Integrations;
          </li>
          <li>
            The conduct, acts, or omissions of any third party, including brokerage providers,
            data vendors, and AI model providers;
          </li>
          <li>Any other matter relating to the Platform.</li>
        </ul>
        <p className={paragraphClass}>
          IN NO EVENT SHALL THE AGGREGATE LIABILITY OF THE G2E PARTIES EXCEED THE GREATER OF
          (A) THE TOTAL AMOUNT YOU HAVE PAID TO G2E TECHNOLOGIES IN THE TWELVE (12) MONTHS
          PRECEDING THE EVENT GIVING RISE TO THE CLAIM, OR (B) ONE HUNDRED U.S. DOLLARS ($100).
        </p>
        <p className={paragraphClass}>
          SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF CERTAIN DAMAGES. IF
          THESE LAWS APPLY TO YOU, SOME OR ALL OF THE ABOVE EXCLUSIONS OR LIMITATIONS MAY NOT
          APPLY, AND YOU MAY HAVE ADDITIONAL RIGHTS.
        </p>
        <p className={paragraphClass}>
          You agree to indemnify, defend, and hold harmless the G2E Parties from and against any
          and all claims, liabilities, damages, losses, costs, and expenses (including reasonable
          attorneys' fees) arising out of or in connection with your use of the Platform, your
          violation of these Terms, or your violation of any applicable law or the rights of a
          third party.
        </p>

        {/* ------------------------------------------------------------------ */}
        {/* 7. Privacy & Data Usage */}
        {/* ------------------------------------------------------------------ */}
        <h2 className={headingClass}>7. Privacy & Data Usage</h2>

        <p className={paragraphClass}>
          G2E Technologies is committed to protecting your privacy. When you use the Platform, we
          collect and process certain personal information necessary to provide our services,
          including:
        </p>
        <ul className={listClass}>
          <li>
            <strong>Account information:</strong> Name, email address, and authentication
            credentials used to create and secure your account.
          </li>
          <li>
            <strong>Brokerage data:</strong> OAuth tokens, API keys, portfolio data, and account
            information obtained through Brokerage Integrations, used solely to provide the
            Platform's features and functionality.
          </li>
          <li>
            <strong>Usage data:</strong> Information about how you interact with the Platform,
            including pages visited, features used, and AI queries submitted, used to improve our
            services.
          </li>
          <li>
            <strong>AI interaction data:</strong> Queries, prompts, and instructions you submit to
            the AI assistant may be processed by third-party AI service providers (including
            Google) subject to their respective terms of service and privacy policies.
          </li>
        </ul>
        <p className={paragraphClass}>
          We do not sell your personal information to third parties. We implement
          industry-standard security measures, including encryption of sensitive data at rest and
          in transit, to protect your information. However, no system can guarantee absolute
          security, and you acknowledge the inherent risks of transmitting information over the
          internet.
        </p>
        <p className={paragraphClass}>
          By using the Platform, you consent to the collection, processing, and use of your
          information as described herein. For questions regarding our data practices, please
          contact us at the information provided on the Platform.
        </p>

        {/* ------------------------------------------------------------------ */}
        {/* Closing Acknowledgment */}
        {/* ------------------------------------------------------------------ */}
        <div className={`mt-8 pt-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={headingClass}>Acknowledgment & Acceptance</h2>
          <p className={paragraphClass}>
            By creating an account on, accessing, or using the G2E Trading platform, you
            acknowledge that you have read and understood these Disclosures, Terms of Use, and
            Risk Disclaimers in their entirety and that you voluntarily agree to be bound by them.
            You further acknowledge that investing involves risk, that AI-Generated Content is not
            personalized investment advice, and that G2E Technologies is not a registered
            investment adviser or broker-dealer.
          </p>
          <p className={paragraphClass}>
            If you have questions or concerns about these Terms or the Platform, please contact
            G2E Technologies through the contact information available on our website.
          </p>
          <p className={`text-xs mt-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
            &copy; {new Date().getFullYear()} G2E Technologies. All rights reserved.
          </p>
        </div>
      </Card>
    </div>
  );
}
