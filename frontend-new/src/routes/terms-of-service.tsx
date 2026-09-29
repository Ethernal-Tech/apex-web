import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { FooterSocials, FooterLegal } from "@/components/ui/footer-socials";
import { SiteHeader } from "@/components/SiteHeader";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/terms-of-service")({
  head: () =>
    pageHead({
      title: "Terms of Use - Skyline",
      description:
        "Read the Terms of Use for Skyline Bridge, the universal bridge for cross-chain assets.",
      path: "/terms-of-service",
    }),
  component: TermsPage,
});

function Footer() {
  return (
    <footer className="border-t border-white/5 bg-background">
      <div className="container-page py-6">
        <div className="flex flex-col items-start justify-between gap-3 text-xs text-muted-foreground md:flex-row md:items-center">
          <div>© {new Date().getFullYear()} Skyline. All rights reserved.</div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <FooterLegal />
            <FooterSocials />
          </div>
        </div>
      </div>
    </footer>
  );
}

function TermsContent() {
  return (
    <article className="container-page py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/bridge-app"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground md:mb-10"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Bridge
        </Link>
        <h1 className="text-balance font-display text-4xl font-semibold md:text-5xl">
          Terms of Use
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Last Updated: 18th Jan 2025
        </p>

        <div className="mt-10 space-y-10 text-sm leading-7 text-muted-foreground">
          <section>
            <p>
              These Terms of Use provide the terms and conditions under which
              you, whether personally or on behalf of an entity ("you" or
              "your"), are permitted to use, interact with, or otherwise access
              the Websites or Features provided by Skyline Bridge (together with
              its affiliates, "Skyline" "we," "us," or "our"). These Terms
              should be read together with other such documents and terms or
              policies that are appended hereto or that incorporated into these
              Terms by reference (collectively, the "Terms").
            </p>
            <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-foreground/90">
              <strong className="text-foreground">
                THE TERMS CONSTITUTE A BINDING AGREEMENT BETWEEN YOU AND US,
                PLEASE READ THEM CAREFULLY BEFORE ACCESSING OR USING THE
                WEBSITES.
              </strong>{" "}
              BY ACCESSING, INTERACTING WITH OR USING ANY OF THE WEBSITES OR
              FEATURES, YOU AGREE THAT YOU ARE ABLE TO ENTER INTO A BINDING
              AGREEMENT AND, AS SUCH, HAVE READ, UNDERSTOOD, AND AGREE TO BE
              BOUND BY THE TERMS, INCLUDING THE BINDING ARBITRATION AGREEMENT
              AND CLASS ACTION WAIVER BELOW. IF YOU DO NOT AGREE TO ALL OF THE
              TERMS, YOU ARE NOT AUTHORIZED TO INTERACT WITH, ACCESS OR USE ANY
              FEATURES OR WEBSITES.
            </p>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl font-semibold text-foreground">
              1. Scope
            </h2>
            <div className="space-y-4">
              <p>
                <strong className="text-foreground">1.1.</strong> These Terms of
                Use govern your access to and use of all websites operated by
                Skyline, including all associated content, features, and
                functionalities (collectively "Features") made available on or
                through these websites or interfaces (collectively "Websites").
                By accessing or using any Skyline website or its associated
                services, you agree to be bound by these Terms. If you do not
                agree to these Terms, you may not use our websites or services.
              </p>
              <p>
                <strong className="text-foreground">1.2.</strong> You agree and
                acknowledge that some of the Websites and Features gather,
                process, or transmit the information generated on-chain (either
                transmitted by or on a blockchain network or through a
                blockchain-based application). Similarly, some of the Websites
                and Features may redirect you or utilize third-party providers
                to display, transmit, or otherwise provide you with certain
                information. You understand and agree that Skyline does not
                maintain, provide, operate, improve, and holds no control over
                any blockchain network, application or feature unless it is
                otherwise expressly stated so herein. Nor do we control, manage,
                or maintain on-chain data, or applications, transmission of such
                information to you. We do not have authority over and do not
                provide a guarantee or take possession or custody of any form
                over your crypto assets, or digital wallets unless expressly
                stated herein. You are solely responsible for familiarizing
                yourself with such data, features, functionalities,
                applications, and other solutions and the terms that apply.
              </p>
              <p>
                <strong className="text-foreground">1.3.</strong> These Terms
                inter alia apply to the following Websites and Features:
              </p>
              <ul className="ml-5 list-disc space-y-1">
                <li>Skyline Bridge</li>
                <li>Skyline Bridge Web app</li>
              </ul>
              <p>
                <strong className="text-foreground">1.4.</strong> You
                acknowledge and agree that all information provided through the
                Websites and Features is for informational purposes only. While
                Skyline strives to ensure accuracy, it does not guarantee that
                the information is current, complete, or reliable. You expressly
                disclaim reliance on any such information and agree that Skyline
                will not be liable for its accuracy or completeness.
              </p>
              <p>
                <strong className="text-foreground">1.5.</strong> You are
                responsible for independently verifying any information before
                relying on it or taking action. None of the information provided
                through the Websites or Features constitutes professional or
                investment advice, nor does it create any duties or obligations
                on our part.{" "}
                <strong className="text-foreground">
                  NO INFORMATION SHOULD BE INTERPRETED AS AN INVITATION OR
                  INDUCEMENT TO BUY, SELL, UNDERWRITE, OR CONVERT ANY CRYPTO
                  ASSETS OR DIGITAL ASSETS.
                </strong>
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl font-semibold text-foreground">
              2. Use Restrictions
            </h2>
            <div className="space-y-4">
              <p>
                <strong className="text-foreground">2.1.</strong> You must be at
                least 18 years old to use the Website. By using the Website or
                Features and agreeing to these Terms, you represent and warrant
                that you are at least 18 years old.
              </p>
              <p>
                <strong className="text-foreground">2.2.</strong> If you are
                entering into the Terms on behalf of an entity, you represent
                and warrant that you have the legal authority to bind such an
                entity.
              </p>
              <p>
                <strong className="text-foreground">2.3.</strong> You agree to
                access and use the Websites and Features only for lawful
                purposes and in accordance with these Terms. You may not use the
                Websites or Features:
              </p>
              <ul className="ml-5 list-disc space-y-1">
                <li>
                  In any way that violates any applicable law, regulation or
                  these Terms.
                </li>
                <li>
                  To engage in any conduct that restricts or inhibits anyone’s
                  use or enjoyment of the Website.
                </li>
                <li>
                  To exploit the Websites or Features for any unauthorized
                  purpose.
                </li>
                <li>
                  To impersonate or attempt to impersonate Skyline Bridge, an
                  Skyline Bridge employee, another user, or any other person or
                  entity.
                </li>
                <li>
                  To harvest or otherwise collect information from the Websites
                  or Features for any unauthorized purpose.
                </li>
                <li>
                  To use the Websites or Features in any manner that could
                  disable, overburden, damage, or impair the Websites or
                  Features or interfere with any other party’s use or enjoyment
                  of the Websites or Features.
                </li>
                <li>
                  To reverse engineer, disassemble, or decompile the Websites or
                  Features or apply any other process or procedure to derive the
                  source code of any software included in the Websites or
                  Features except to the extent applicable law does not allow
                  this restriction or such rights have been expressly granted to
                  you under a separate license.
                </li>
                <li>
                  To sublicense, sell, or otherwise distribute the Websites or
                  Features, or any portion thereof.
                </li>
                <li>
                  To use any data mining tools, robots, crawlers, or similar
                  data gathering and extraction tools to scrape or otherwise
                  remove data from the Websites or Features.
                </li>
                <li>
                  To use any manual process to monitor or copy any of the
                  material on the Websites or Features or for any other
                  unauthorized purpose without our prior written consent.
                </li>
                <li>
                  To introduce any viruses, trojan horses, worms, logic bombs,
                  or other material that is malicious or technologically harmful
                  to the Websites or Features.
                </li>
                <li>
                  To attempt to gain unauthorized access to, interfere with,
                  damage, or disrupt any parts of the Websites or Features, the
                  server(s) on which the Websites or Features are stored, or any
                  server, computer or database connected to the Websites or
                  Features.
                </li>
                <li>
                  To attack the Websites or Features via a denial-of-service
                  attack or a distributed denial-of-service attack or otherwise
                  attempt to interfere with the proper working of the Websites
                  or Features.
                </li>
              </ul>
              <p>
                <strong className="text-foreground">2.4.</strong> You represent
                and warrant that you are not, and for the duration of the time
                you use the Websites and Features, will not be (i) the subject
                of economic or trade sanctions administered or enforced by any
                governmental authority or otherwise designated on any list of
                prohibited or restricted parties; (ii) in contravention of any
                laws and regulations pertaining to anti-money laundering or
                terrorist financing; (iii) included on the List of Specially
                Designated Nationals and Blocked Persons maintained by the US
                Treasury Department’s Office of Foreign Assets Control (OFAC) or
                on any list pursuant to European Union (EU) and/or United
                Kingdom (UK) regulations (as the latter are extended to the
                Cayman Islands by statutory instrument); or (iv) operationally
                based or domiciled in a country or territory in which sanctions
                imposed by the United Nations (whether through the Security
                Council or otherwise), OFAC, the EU and/or the UK apply, or
                otherwise pursuant to sanctions imposed by the United Nations,
                OFAC, EU, or UK.
              </p>
              <p>
                <strong className="text-foreground">2.5.</strong> You
                acknowledge that you are solely responsible for properly
                configuring, as applicable, and using the Features or
                incorporating the Features into your applications or Wallet and
                for taking appropriate action to secure your data, including
                without limitation, financial or token information and private
                keys.
              </p>
              <p>
                <strong className="text-foreground">2.6.</strong> You
                acknowledge and agree that you have the financial and technical
                sophistication to properly use and interact with the Websites
                and Features and that you understand the inherent risks of
                blockchain technology.
              </p>
              <p>
                <strong className="text-foreground">2.7.</strong> You understand
                that transacting in crypto-assets and applications utilizing
                crypto-assets is risky and may subject you to cyberattack, loss
                of crypto-assets, unknown exploits, smart contract risks,
                governance attacks, and other risks related to blockchain
                transactions.
              </p>
              <p>
                <strong className="text-foreground">2.8.</strong> You also
                understand that transactions executed and settled via smart
                contracts are not reversible and you may not have recourse in
                the event of a malicious, fraudulent, or inadvertent
                transaction.
              </p>
              <p>
                <strong className="text-foreground">2.9.</strong> If at any
                point the above is no longer true or you do not meet these
                requirements, you are prohibited from accessing, using, or
                otherwise interacting with the Websites and Features and must
                immediately cease using any and all of them.
              </p>
              <p>
                <strong className="text-foreground">2.10.</strong> You further
                acknowledge and agree that in the event that you use any of our
                Websites or Features in a prohibited manner, we may investigate
                or take any other action we deem necessary, including
                cooperating with law enforcement or bringing claims against you
                if they result in harm or damage to Skyline, to rectify the
                prohibited conduct or any consequences resulting therefrom.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl font-semibold text-foreground">
              3. Intellectual Property Rights
            </h2>
            <h3 className="mb-3 font-display text-lg font-semibold text-foreground">
              a) Skyline Property
            </h3>
            <div className="space-y-4">
              <p>
                <strong className="text-foreground">3.1.</strong> Skyline and
                its licensors retain exclusive ownership of all rights, titles,
                and interests in and to the Websites and Features, including but
                not limited to visual designs, graphics, systems, methods,
                computer code, software, compilations of content, data, and
                other proprietary information or elements of the Websites and/or
                Features (collectively, the "Skyline Property"). The Websites
                and Features contain proprietary and confidential information
                protected by applicable intellectual property laws. Except as
                expressly provided in these Terms or otherwise authorized by
                Skyline, you agree not to copy, modify, rent, lease, loan, sell,
                distribute, perform, display, or create derivative works based
                on the Websites or Features, in whole or in part.
              </p>
              <p>
                <strong className="text-foreground">3.2.</strong> All
                trademarks, service marks, trade names, logos, and branding
                ("Skyline Trademarks") used on or in connection with the
                Websites and Features are the exclusive property of Skyline or
                its licensors. You are not granted any rights or licenses to use
                the Skyline Trademarks without prior written consent from
                Skyline. Any unauthorized use of Skyline Trademarks is strictly
                prohibited. Skyline reserves all rights over its Trademarks and
                will enforce its intellectual property rights to the fullest
                extent permitted by law.
              </p>
              <p>
                <strong className="text-foreground">3.3.</strong> Trademarks,
                service marks, trade names, logos, or branding of third parties
                that may appear on the Websites or Features are the property of
                their respective owners. Skyline does not claim ownership of
                these third-party trademarks and their inclusion does not imply
                any affiliation with or endorsement by Skyline unless expressly
                stated. You may not use any third-party trademarks displayed on
                the Websites or Features without the permission of the
                respective trademark owner.
              </p>
              <p>
                <strong className="text-foreground">3.4.</strong> Subject to
                these Terms, Skyline grants you a personal, limited, revocable,
                non-exclusive, non-sublicensable, and non-transferable license
                to access and use the Websites and Features solely for personal,
                non-commercial purposes. This license does not confer ownership
                or any other rights to the Websites, Features, or their content,
                except as explicitly provided herein.
              </p>
              <p>
                <strong className="text-foreground">3.5.</strong> All
                intellectual property rights, including copyrights, patents,
                trademarks, trade secrets, and other proprietary rights
                associated with the Skyline Property, Websites and Features and
                their content, are owned by Skyline, its affiliates, licensors,
                or, where applicable, Users. No rights, titles, interests, or
                intellectual property rights are transferred to you under these
                Terms, except for the limited license explicitly granted herein.
                No implied licenses are granted under these Terms. Skyline
                reserves all rights not expressly granted.
              </p>
              <p>
                <strong className="text-foreground">3.6.</strong> Certain
                Features, components, or Websites provided as part of our
                services may be offered under separate open-source licenses,
                such as the Apache License 2.0 or the MIT License, or may
                include software or materials licensed by third parties under
                their own terms ("Third-Party Licenses"). In such cases, the
                applicable open-source or third-party license will govern your
                use of those specific features, components, or materials and
                will take precedence over any conflicting provisions in these
                Terms. Where required, we will make the source code and license
                terms available to you. You acknowledge and agree that your
                rights with respect to such open-source or third-party features
                are limited to those expressly granted under the applicable
                licenses.
              </p>
              <p>
                <strong className="text-foreground">3.7.</strong> You
                acknowledge and agree not to use the Skyline Property in any
                manner not expressly permitted under these Terms. This includes
                but is not limited to the unauthorized reproduction,
                distribution, or creation of derivative works from any aspect of
                the Websites or Features.
              </p>
            </div>
            <h3 className="mb-3 mt-6 font-display text-lg font-semibold text-foreground">
              b) Use Content License
            </h3>
            <div className="space-y-4">
              <p>
                <strong className="text-foreground">3.8.</strong> By providing,
                submitting, or uploading any content, data, or information
                ("User Content") to Skyline through the Websites or Features,
                you grant Skyline a worldwide, perpetual, irrevocable,
                royalty-free, non-exclusive, sublicensable, and transferable
                license to use, reproduce, modify, adapt, publish, translate,
                distribute, display, and create derivative works based on your
                User Content in connection with the operation, improvement, and
                promotion of the Websites and Features, and any other services
                provided by Skyline.
              </p>
              <p>
                <strong className="text-foreground">3.9.</strong> You represent
                and warrant that:
              </p>
              <ul className="ml-5 list-disc space-y-1">
                <li>
                  You own or have all necessary rights, licenses, consents, and
                  permissions to grant the license set forth in this clause;
                </li>
                <li>
                  Your User Content does not infringe or violate any third-party
                  intellectual property rights, privacy rights, or applicable
                  laws; and
                </li>
                <li>
                  Your User Content is not confidential or proprietary and does
                  not contain sensitive personal information unless specifically
                  requested by Skyline.
                </li>
              </ul>
              <p>
                <strong className="text-foreground">3.10.</strong> Skyline will
                not claim ownership of your User Content, but you acknowledge
                and agree that Skyline may retain copies of your User Content
                and may continue to use it in accordance with the license
                granted herein, even if you terminate your use of the Websites
                or Features.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl font-semibold text-foreground">
              4. Disclaimer of Warranties
            </h2>
            <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-foreground/90">
              <strong className="text-foreground">4.1.</strong> THE WEBSITE IS
              PROVIDED “AS IS” AND “AS AVAILABLE” WITH ALL FAULTS WITHOUT
              WARRANTY OF ANY KIND. SKYLINE BRIDGE DISCLAIMS ALL WARRANTIES AND
              CONDITIONS, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING BUT
              NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
              PARTICULAR PURPOSE, TITLE, QUIET ENJOYMENT, ACCURACY, OR
              NON-INFRINGEMENT.
            </p>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl font-semibold text-foreground">
              5. Limitation of Liability
            </h2>
            <div className="space-y-4">
              <p>
                <strong className="text-foreground">5.1.</strong> Skyline is not
                responsible for the actions, activities, or claims of
                individuals or entities that develop or use applications,
                validate or verify transactions, or otherwise interact with
                blockchain networks. Skyline does not control these networks,
                their operators, or their marketing materials. You acknowledge
                and agree that any assumptions of affiliation between Skyline
                and blockchain networks based on such materials are unfounded.
              </p>
              <p>
                <strong className="text-foreground">5.2.</strong> Skyline does
                not control, maintain, or operate the underlying smart contract
                or blockchain protocols supporting tools and applications
                accessible through the Websites and Features unless explicitly
                stated otherwise. Skyline does not effectuate, facilitate, or
                control transactions initiated via the Websites or Features and
                is not responsible for the outcome of any transactions,
                including but not limited to failed, unintended, or fraudulent
                transactions that may result in loss of funds, transaction fees,
                or any other harm.
              </p>
              <p>
                <strong className="text-foreground">5.3.</strong> All
                transactions broadcast to blockchain networks via your connected
                wallet may require the payment of non-refundable network fees.
                You acknowledge and agree that these fees are solely your
                responsibility, and Skyline is not liable for such costs or for
                any failed transactions due to insufficient funds for fees.
              </p>
              <p>
                <strong className="text-foreground">5.4.</strong> You
                acknowledge that using the Websites and Features may have tax
                consequences. It is your sole responsibility to assess and
                address any tax obligations arising from your use of the
                Websites or Features and to comply with all applicable tax laws
                in your jurisdiction.
              </p>
              <p>
                <strong className="text-foreground">5.5.</strong> To the fullest
                extent permitted by law, Skyline will not be liable for any:
              </p>
              <ul className="ml-5 list-disc space-y-1">
                <li>Loss of profits, sales, business, or revenue;</li>
                <li>Business interruption;</li>
                <li>Loss of anticipated savings;</li>
                <li>
                  Loss of business opportunities, goodwill, or reputation; or
                </li>
                <li>
                  Indirect, incidental, consequential, special, exemplary, or
                  punitive damages, even if advised of the possibility of such
                  damages.
                </li>
              </ul>
              <p>
                <strong className="text-foreground">5.6.</strong> If Skyline is
                found to be liable for any loss or damage arising from or in
                connection with these Terms, its total liability will be limited
                to the greater of €100 or the minimum amount permitted by
                applicable law.
              </p>
              <p>
                <strong className="text-foreground">5.7.</strong> Some
                jurisdictions do not allow the exclusion of certain warranties
                or the limitation of liability for incidental or consequential
                damages. In such jurisdictions, Skyline’s liability will be
                limited to the maximum extent permitted by law.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl font-semibold text-foreground">
              6. Third-Party Services
            </h2>
            <div className="space-y-4">
              <p>
                <strong className="text-foreground">6.1.</strong> The Websites
                and Features may include links to third-party websites,
                services, content, or information (collectively, "Third-Party
                Services") for your convenience. We do not endorse, control, or
                assume responsibility for any Third-Party Services, including
                their accuracy, completeness, reliability, legality,
                performance, or availability. Your use of such Third-Party
                Services is at your own risk and subject to the terms and
                conditions of the respective third parties.
              </p>
              <p>
                <strong className="text-foreground">6.2.</strong> Any
                interaction, agreement, or transaction between you and any third
                party, including providers of Third-Party Services, is solely
                between you and the third party.
              </p>
              <p>
                <strong className="text-foreground">6.3.</strong> Skyline is not
                a party to, and will not be responsible for, any such
                interactions or transactions, including payment, delivery,
                warranties, or any other obligations associated with such
                Third-Party Services.
              </p>
              <p>
                <strong className="text-foreground">6.4.</strong> Skyline
                disclaims all liability for any loss, damage, or harm arising
                from or relating to your use of or reliance on Third-Party
                Services. This includes but is not limited to, errors,
                omissions, or delays in the content or operation of such
                Third-Party Services.
              </p>
              <p>
                <strong className="text-foreground">6.5.</strong> Skyline
                reserves the right to modify, restrict, or remove access to any
                Third-Party Services provided or linked through the Websites and
                Features at any time, without notice or liability to you.
              </p>
              <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-foreground/90">
                <strong className="text-foreground">6.6.</strong> ANY AND ALL
                TRANSACTIONS INITIATED THROUGH OUR SERVICE ARE FACILITATED AND
                RUN BY THIRD-PARTY ELECTRONIC WALLET EXTENSIONS, AND BY USING
                OUR SERVICES, WEBSITES, AND FEATURES YOU AGREE THAT YOU ARE
                GOVERNED BY THE TERMS OF SERVICE AND PRIVACY POLICY FOR ALL SUCH
                APPLICABLE EXTENSIONS.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl font-semibold text-foreground">
              7. Indemnification
            </h2>
            <div className="space-y-4">
              <p>
                <strong className="text-foreground">7.1.</strong> You agree to
                defend, indemnify, and hold harmless Skyline, its Affiliates,
                licensors, service providers, and each of their respective
                officers, directors, employees, contractors, agents, suppliers,
                successors, and assigns (collectively, the “Indemnified
                Parties”) from and against any and all claims, demands,
                lawsuits, proceedings, liabilities, damages, judgments, awards,
                losses, costs, expenses, or fees, including reasonable
                attorneys’ fees (“Damages”), arising out of or relating to:
              </p>
              <ul className="ml-5 list-disc space-y-1">
                <li>
                  your access to, use, misuse, or contribution to the Websites
                  and Features;
                </li>
                <li>
                  your breach of these Terms or violation of applicable law by
                  you, your customers, users, employees, or other personnel;
                </li>
                <li>any dispute between you and a third party;</li>
                <li>
                  your alleged or actual infringement or misappropriation of any
                  third party’s intellectual property or other rights; or
                </li>
                <li>your Feedback or other contributions.</li>
              </ul>
              <p>
                This indemnification applies regardless of the cause or alleged
                cause, including claims that are groundless, fraudulent, false,
                or lack merit, and regardless of the theory of recovery.
              </p>
              <p>
                <strong className="text-foreground">7.2.</strong> Subpoenas and
                Legal Orders. In the event the Indemnified Parties receive a
                subpoena, compulsory legal order, or other process associated
                with any claims described in clause 13.1, you agree to reimburse
                the Indemnified Parties for their employees’ and contractors’
                time, materials, and expenses incurred in responding to such
                matters at their then-current hourly rates, in addition to
                covering their reasonable attorneys’ fees.
              </p>
              <p>
                <strong className="text-foreground">7.3.</strong> Control of
                Proceedings. If you are obligated to indemnify the Indemnified
                Parties, Skyline will have the sole right, at its discretion, to
                control the defense, settlement, or resolution of any claim,
                demand, or proceeding. Skyline may choose to settle such claims
                on terms it deems appropriate, and you agree to fully cooperate
                with Skyline in the defense or settlement of such claims,
                including providing any assistance or information reasonably
                requested.
              </p>
              <p>
                <strong className="text-foreground">7.4.</strong> Additional
                Remedies. The indemnities set out in this clause are in addition
                to, and not in lieu of, any other remedies available to the
                Indemnified Parties under applicable law.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl font-semibold text-foreground">
              8. Restricted Access
            </h2>
            <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-foreground/90">
              <strong className="text-foreground">8.1.</strong> WITHOUT LIMITING
              ANY OTHER PROVISION OF THESE TERMS, WE RESERVE THE RIGHT TO, IN
              OUR SOLE DISCRETION AND WITHOUT NOTICE OR LIABILITY, DENY ACCESS
              TO AND USE OF THE WEBSITES AND FEATURES (INCLUDING BLOCKING
              CERTAIN IP ADDRESSES), TO ANY PERSON FOR ANY REASON OR FOR NO
              REASON, INCLUDING, WITHOUT LIMITATION FOR BREACH OF ANY WARRANTY,
              REPRESENTATION CONTAINED IN THESE TERMS OR ANY APPLICABLE LAW OR
              REGULATION. WE ARE NOT RESPONSIBLE FOR ANY LOSS OR HARM RELATED TO
              YOUR INABILITY TO ACCESS OR USE OUR WEBSITES AND FEATURES.
            </p>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl font-semibold text-foreground">
              9. Governing Law and Legal Proceedings
            </h2>
            <div className="space-y-4">
              <p>
                <strong className="text-foreground">9.1.</strong> These Terms
                shall be governed by and construed in accordance with the laws
                of Switzerland, without regard to its conflict of law
                principles.
              </p>
              <p>
                <strong className="text-foreground">9.2.</strong> We reserve the
                right to take appropriate legal actions and proceedings against
                anyone who, in our sole discretion, violates the law or these
                Terms and/or discloses such information to law enforcement
                authorities as we reasonably feel is necessary or as required by
                law. The actions we may take are not limited to those described,
                and we may take any other action we reasonably deem appropriate.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl font-semibold text-foreground">
              10. Disputes
            </h2>
            <div className="space-y-4">
              <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-foreground/90">
                <strong className="text-foreground">10.1.</strong> YOU AGREE AND
                UNDERSTAND THAT BY ENTERING INTO THIS AGREEMENT, YOU EXPRESSLY
                WAIVE ANY RIGHT, IF ANY, TO A TRIAL BY JURY AND THE RIGHT TO
                PARTICIPATE IN A CLASS ACTION LAWSUIT.
              </p>
              <p>
                <strong className="text-foreground">10.2.</strong> If an alleged
                breach, controversy, claim, dispute or difference arises out of
                or in connection with these Terms (a “Dispute”), you agree to
                seek to resolve the matter with us amicably by referring the
                matter to{" "}
                <a
                  href="mailto:contact@skylinebridge.tech"
                  className="text-[oklch(0.85_0.15_235)] hover:underline"
                >
                  contact@skylinebridge.tech
                </a>{" "}
                with a detailed description, the date and time the issue arose,
                your contact information to contact you on and the outcome you
                are seeking.
              </p>
              <p>
                <strong className="text-foreground">10.3.</strong> In the event
                a Dispute cannot be resolved amicably in accordance with clause
                10.2. above, within a period of sixty (60) days, then any such
                Dispute, controversy, or claim arising out of or in connection
                with these Terms, including any question regarding its
                existence, validity, or termination, shall be referred to and
                finally resolved by arbitration under the rules of the London
                Court of International Arbitration ("LCIA Rules"). The seat of
                the arbitration shall be Switzerland. The arbitration will be
                conducted confidentially by a single arbitrator appointed in
                accordance with the LCIA Rules. The language to be used in the
                arbitral proceedings shall be English. The governing law of
                these Terms shall be the substantive law of Switzerland.
              </p>
              <p>
                <strong className="text-foreground">10.4.</strong> You agree and
                acknowledge that your agreement to arbitrate any dispute with
                Skyline and your waiver of any right to participate in a class
                action or representative claim, as provided in these Terms,
                shall remain in full force and effect regardless of any
                termination or expiration of these Terms, any discontinuation of
                your use of the Websites and Features for any reason (including
                changes to these Terms), or any claim that these Terms or any
                part thereof are invalid, void, or unenforceable. This agreement
                to arbitrate and class action waiver constitutes an independent
                and severable obligation that remains binding and enforceable
                regardless of the applicability or enforceability of any other
                provisions in these Terms.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl font-semibold text-foreground">
              11. Changes to these Terms
            </h2>
            <div className="space-y-4">
              <p>
                <strong className="text-foreground">11.1.</strong> Skyline
                reserves the right to update, modify, eliminate, or change the
                Websites, content thereof, Features, and these Terms at any
                time, at its sole discretion. Such changes may be made without
                prior notice to you, however, we will publish the latest version
                on the Websites and provide the last updated date at the top of
                the Terms. We encourage you to periodically review the Websites
                to stay informed of the latest Terms and any updates that may
                have been implemented.
              </p>
              <p>
                <strong className="text-foreground">11.2.</strong> By continuing
                to use the Websites and/or Features after we have updated these
                Terms, you agree to be bound by the revised Terms. If you do not
                agree to be bound by the revised Terms, you are prohibited from
                using and accessing the Websites and Features thereof.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl font-semibold text-foreground">
              12. Severability
            </h2>
            <p>
              <strong className="text-foreground">12.1</strong> If any provision
              of these Terms is found to be invalid, illegal, or unenforceable
              for any reason, the remaining provisions shall not be affected and
              shall continue in full force and effect. The invalid, illegal, or
              unenforceable provision shall be deemed modified to the minimum
              extent necessary to make it valid, legal, and enforceable, or, if
              modification is not possible, it shall be deemed severed from
              these Terms.
            </p>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl font-semibold text-foreground">
              13. Miscellaneous
            </h2>
            <div className="space-y-4">
              <p>
                <strong className="text-foreground">13.1.</strong> No
                Relationship or Assignments. Nothing in these Terms shall be
                construed to create any agency, partnership, joint venture,
                employer-employee, or franchisor-franchisee relationship between
                you and Skyline. You may not assign or transfer these Terms, by
                operation of law or otherwise, without prior written consent
                from Skyline. Any attempt by you to assign or transfer these
                Terms without such consent shall be null and void. We may assign
                or transfer these Terms without restriction or notification.
              </p>
              <p>
                <strong className="text-foreground">13.2.</strong> Personally
                Identifiable Information and Privacy Policy. Please refer to our
                Privacy Policy for information about how we collect, use, and
                share personal information about you.
              </p>
              <p>
                <strong className="text-foreground">13.3.</strong> Entire
                Agreement. These Terms, including any policies or documents
                incorporated by reference, constitute the entire agreement
                between you and Skyline regarding the use of the Websites and
                Features. They supersede and replace any prior or
                contemporaneous understandings, agreements, or communications,
                whether written or oral, regarding the subject matter hereof.
              </p>
              <p>
                <strong className="text-foreground">13.4.</strong> No Waiver.
                The failure of Skyline to enforce any provision of these Terms
                or respond to a breach by you or others shall not constitute a
                waiver of its rights to enforce any other terms or conditions or
                respond to any breaches in the future.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl font-semibold text-foreground">
              14. Contact Information
            </h2>
            <p>
              <strong className="text-foreground">14.1.</strong> If you have any
              questions about these Terms, please contact us at Skyline Bridge
              at{" "}
              <a
                href="mailto:contact@skylinebridge.tech"
                className="text-[oklch(0.85_0.15_235)] hover:underline"
              >
                contact@skylinebridge.tech
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}

function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <TermsContent />
      </main>
      <Footer />
    </div>
  );
}
