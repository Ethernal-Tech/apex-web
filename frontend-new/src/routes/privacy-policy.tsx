import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { FooterSocials, FooterLegal } from "@/components/ui/footer-socials";
import { SiteHeader } from "@/components/SiteHeader";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/privacy-policy")({
  head: () =>
    pageHead({
      title: "Privacy Policy - Skyline",
      description:
        "Read the Personal Data Protection Policy for Skyline Bridge.",
      path: "/privacy-policy",
    }),
  component: PrivacyPage,
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

function PrivacyContent() {
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
          Personal Data Protection Policy
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Last Updated: 24.01.2025
        </p>

        <div className="mt-10 space-y-10 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="mb-4 font-display text-2xl font-semibold text-foreground">
              1. Introductory Information
            </h2>
            <div className="space-y-4">
              <p>
                At Skyline we respect your right to privacy and take personal
                data protection extremely seriously, as we would like to provide
                you with the highest level of protection of the personal data
                that you have trusted us.
              </p>
              <p>
                This Policy is based on applicable relevant legislation on the
                protection of personal data, in particular the General Data
                Protection Regulation of the EU.
              </p>
              <p>
                In this Personal Data Protection Policy (hereinafter referred to
                as: Policy), we define ways of collecting your personal data,
                the purposes for which we collect it, the security measures we
                use to protect it, the persons with whom we share it, and your
                rights regarding the protection of personal data.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl font-semibold text-foreground">
              2. Controller of Personal Data
            </h2>
            <div className="space-y-4">
              <p>
                This Policy applies to all personal data collected and stored by
                Skyline, to be organised under the laws of Switzerland
                (hereinafter referred to as &quot;Skyline&quot;, &quot;We&quot;,
                &quot;Us&quot;). The Policy governs your access to and use of
                all websites operated by Skyline, including all associated
                content, features, and functionalities (collectively
                &quot;Features&quot;) made available on or through these
                websites or interfaces (collectively &quot;Websites&quot;). By
                accessing or using any Skyline Websites or its associated
                services and Features, you agree to be bound by this Policy. If
                you do not agree to this Policy, you may not use our websites or
                services.
              </p>
              <p>
                As a data controller, Skyline shall be responsible for
                processing and storing of your personal data.
              </p>
              <p>
                In order to further upgrade the level of personal data
                protection, Skyline has appointed an authorized person for the
                protection of personal data, which ensures that the handling of
                personal data is at all times consistent with the relevant
                legislation.
              </p>
              <p>
                If you have any questions regarding the use of this Policy or
                with regards to the exercise of your rights arising from this
                Policy, please contact us at any of the following contacts:
              </p>
              <p>
                <a
                  href="mailto:contact@skylinebridge.tech"
                  className="text-foreground hover:underline"
                >
                  contact@skylinebridge.tech
                </a>
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl font-semibold text-foreground">
              3. Policy Users
            </h2>
            <p>This Policy is for:</p>
            <ul className="ml-5 mt-3 list-disc space-y-1">
              <li>visitors to our Websites and</li>
              <li>users of our Website and Features.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl font-semibold text-foreground">
              4. Terms and Definitions
            </h2>
            <div className="space-y-4">
              <p>
                Here you can find an explanation of the basic concepts that we
                use in our Policy.
              </p>
              <p>
                Each particular concept defined below has a meaning within this
                Policy as defined in this section.
              </p>
              <p>
                <strong className="text-foreground">Personal data</strong> means
                any information that refers to a specific or identifiable
                individual (for example, the name, surname, e-mail address,
                telephone number, and identifiers that are specific to the
                individual’s physical, physiological, genetic, economic, mental,
                cultural, or social identity, etc.).
              </p>
              <p>
                <strong className="text-foreground">A controller</strong> is a
                legal entity that determines the purposes and means of
                processing of your personal data.
              </p>
              <p>
                <strong className="text-foreground">Processor</strong> means a
                legal or natural person who processes personal data on behalf of
                the controller.
              </p>
              <p>
                <strong className="text-foreground">Processing</strong> means
                collecting, storing, accessing, and all other forms of use of
                personal data.
              </p>
              <p>
                <strong className="text-foreground">EEA</strong> means the
                European Economic Area, which identifies all the Member States
                of the European Union, Iceland, Norwa,y and Liechtenstein.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl font-semibold text-foreground">
              5. Processing of Personal Data
            </h2>
            <div className="space-y-4">
              <p>
                At Skyline, we process your personal data solely on the basis of
                clearly stated and legitimate purposes, securely and
                transparently.
              </p>
              <p>
                We collect your personal data when you provide it to us (for
                example, by becoming our member, using our website, signing up
                for our newsletter, inquiring by e-mail, telephone, or writing
                to our address or by any other means in which you provide us
                with your personal data).
              </p>
              <p>
                Your personal data can also be obtained through your interaction
                with the website; such information can be obtained by using
                cookies and a cookie-like technology that allows us to customize
                and personalize our website to your needs.
              </p>

              <h3 className="mb-3 mt-8 font-display text-lg font-semibold text-foreground">
                5.1. What type of personal data do we collect?
              </h3>
              <p>
                Your personal data can be obtained directly from you when you
                provide us with this information (for example, by logging into
                your member account, etc.). We can also obtain your personal
                data through the use of our services (e.g. webpage, newsletter).
              </p>
              <div className="overflow-hidden rounded-xl border border-white/10">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/[0.03]">
                    <tr>
                      <th className="px-4 py-3 font-medium text-foreground">
                        Category of personal data
                      </th>
                      <th className="px-4 py-3 font-medium text-foreground">
                        Personal data collected
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-white/10">
                      <td className="px-4 py-3 font-medium text-foreground">
                        Identity data
                      </td>
                      <td className="px-4 py-3">
                        Name, surname, username, profile picture, data used for
                        comfortable login/registration, KYC data
                      </td>
                    </tr>
                    <tr className="border-t border-white/10">
                      <td className="px-4 py-3 font-medium text-foreground">
                        Contact data
                      </td>
                      <td className="px-4 py-3">e-mail, telephone number</td>
                    </tr>
                    <tr className="border-t border-white/10">
                      <td className="px-4 py-3 font-medium text-foreground">
                        Biography data
                      </td>
                      <td className="px-4 py-3">
                        Biography, personal site, portfolio, preferences
                      </td>
                    </tr>
                    <tr className="border-t border-white/10">
                      <td className="px-4 py-3 font-medium text-foreground">
                        Website and Features activity data
                      </td>
                      <td className="px-4 py-3">
                        Profile, other activity on Websites and Features
                      </td>
                    </tr>
                    <tr className="border-t border-white/10">
                      <td className="px-4 py-3 font-medium text-foreground">
                        Payment data
                      </td>
                      <td className="px-4 py-3">
                        Digital wallet info, other information in accordance
                        with terms of use
                      </td>
                    </tr>
                    <tr className="border-t border-white/10">
                      <td className="px-4 py-3 font-medium text-foreground">
                        Technical data
                      </td>
                      <td className="px-4 py-3">
                        Internet protocol (IP) address, your sign-in data,
                        browser type and version, time zone setting, and
                        location, browser plug-in types and versions, operating
                        system, and other technology on the devices you use to
                        access this website or use our services.
                      </td>
                    </tr>
                    <tr className="border-t border-white/10">
                      <td className="px-4 py-3 font-medium text-foreground">
                        Website and Features usage data
                      </td>
                      <td className="px-4 py-3">
                        Data related to your usage of the Websites and Features.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="mb-3 mt-8 font-display text-lg font-semibold text-foreground">
                5.2. On what legal basis do we collect and process your personal
                data
              </h3>
              <p>
                In accordance with the legislation governing the protection of
                personal data, we may process your personal data on the
                following legal bases:
              </p>
              <ul className="ml-5 list-disc space-y-1">
                <li>
                  <strong className="text-foreground">Contract.</strong> We
                  process your personal data when such processing is required to
                  complete the contract that you have concluded);
                </li>
                <li>
                  <strong className="text-foreground">Consent.</strong> We
                  process your personal data when you have given consent for the
                  specific purposes of processing, and you are always entitled
                  to revoke that consent;
                </li>
                <li>
                  <strong className="text-foreground">
                    Legitimate interest.
                  </strong>{" "}
                  We process your personal data when Skyline has a legitimate
                  interest in processing. We will expressly define within this
                  Policy in what events we process the data on a legitimate
                  interest basis. The list of legitimate interests and the
                  processing methods we use is provided further in the document.
                </li>
                <li>
                  <strong className="text-foreground">The law.</strong> When
                  processing is necessary for the fulfillment of legal
                  obligations.
                </li>
              </ul>

              <h3 className="mb-3 mt-6 font-display text-lg font-semibold text-foreground">
                Is the provision of personal data mandatory?
              </h3>
              <p>
                The provision of personal data is mandatory in certain cases. In
                most cases, you provide us with personal data on a voluntary
                basis. It is obligatory to provide only the personal data that
                we collect on the basis of the requirements of the legislation.
              </p>
              <p>
                The provision of personal data that we need to fulfill the
                contract is voluntary. However, in the event that you do not
                provide us with all the personal data that we need to execute
                the contract, we will not be able to provide full services.
              </p>
              <p>
                Granting consent is always voluntary. However, in case of
                consent revocation or denial of consent, we will not be able to
                provide certain services (such as advertising adjustments to
                suit your needs).
              </p>

              <h3 className="mb-3 mt-8 font-display text-lg font-semibold text-foreground">
                5.3. Processing purposes
              </h3>
              <p>
                Skyline will only process your data for specified, explicit, and
                legitimate purposes. We undertake not to process your personal
                data in a manner incompatible with the purposes defined in this
                Policy.
              </p>
              <p>
                The purposes for which we can use your personal data are defined
                below. Skyline may use your personal data for one or more of the
                purposes identified below.
              </p>
              <p>
                The purposes for which we will use your personal data are the
                following:
              </p>
              <ul className="ml-5 list-disc space-y-1">
                <li>
                  <strong className="text-foreground">
                    Maintenance of the services.
                  </strong>{" "}
                  In order to enable you to become a member we will process your
                  personal data, necessary for registration. This purpose also
                  includes enabling you to use your account and profile within
                  the Websites and Features.
                </li>
                <li>
                  <strong className="text-foreground">
                    Enabling you comfortable registration.
                  </strong>{" "}
                  In order to enable you quick access to our Websites and
                  Features we offer login with certain digital wallets (i.e.
                  comfortable registration). By connecting your digital wallet
                  with our Websites and Features you agree with our terms of
                  use. When using comfortable registration this privacy policy
                  applies. You can read more on comfortable registration below.
                  We offer this based on our legitimate interest offering safe
                  and comfortable usage of our Websites and Features.
                </li>
                <li>
                  <strong className="text-foreground">
                    Communicating with you to provide quality responses to your
                    inquiries.
                  </strong>{" "}
                  Communication is carried out on the basis of our legitimate
                  interest to ensure effective communication with our members as
                  well as visitors.
                </li>
                <li>
                  <strong className="text-foreground">
                    Implementation of digital marketing.
                  </strong>{" "}
                  Marketing of our services and products can be done in a
                  variety of ways - remarketing, ˝account-based˝ marketing and
                  tracking users on our website. We will use digital marketing
                  based on consent and/or legitimate interest and we will make
                  sure that you will be informed about such marketing in
                  advance.
                </li>
                <li>
                  <strong className="text-foreground">
                    Enabling the purchase.
                  </strong>{" "}
                  In order to process purchase procedures we process personal
                  data of members (sellers) and buyers (visitors). We offer the
                  possibility of downloading digital material via our website.
                  Before transferring such materials, you will be explicitly
                  informed about this, and we will also make such transfers
                  based on contractual relationship (your purchase).
                </li>
                <li>
                  <strong className="text-foreground">
                    Transmission of personal data to third parties.
                  </strong>{" "}
                  We will only provide personal data to third parties as defined
                  in Chapter 6 of this Policy.
                </li>
                <li>
                  <strong className="text-foreground">
                    To enforce any legal claims and to settle disputes.
                  </strong>{" "}
                  Personal data can be disclosed in order to protect our
                  business and to enforce and / or protect our rights. We will
                  disclose your personal information only in the manner and
                  under the conditions required by law.
                </li>
                <li>
                  <strong className="text-foreground">
                    For the purposes of statistical analysis.
                  </strong>{" "}
                  In order to improve the user experience, we analyze the use of
                  our website. Statistical analyzes are carried out on the basis
                  of our legitimate interest in providing an optimal and
                  efficient website.
                </li>
                <li>
                  <strong className="text-foreground">
                    Executing user satisfaction surveys.
                  </strong>{" "}
                  Categories of personal data we process differs depending on
                  the theme of the survey, and shall be disclosed with each
                  survey. We execute user satisfaction surveys based on our
                  legitimate interest to improve and optimize our business
                  activities.
                </li>
              </ul>
              <p>
                In the event that there is a need for further processing of
                personal data (for a different purpose than for the purpose for
                which personal data were originally obtained), we will inform
                you in advance and, when necessary, request for consent. You are
                entitled to revoke at any time any processing of your personal
                data, based on your consent. You can notify us of the revocation
                of the consent at any of the contact points defined in Chapter 2
                of this Policy.
              </p>

              <h3 className="mb-3 mt-6 font-display text-lg font-semibold text-foreground">
                What is a comfortable registration?
              </h3>
              <p>
                During account setup, you can automatically connect the
                previously saved data from your digital wallet with data
                required for registration. Please consult your digital wallet
                provider on information which data shall be transferred using
                comfortable registration. To provide our services, we only store
                and process your name and your email address.
              </p>
              <p>
                After the execution of the comfortable registration, you no
                longer need to register on our site if you are already
                registered in your digital wallet. The appropriate cookie is set
                in your browser and used the next time you visit the Websites
                and Features.
              </p>
              <p>
                The data stored as part of the comfortable registration is used
                exclusively for the provision of services of our site, in
                particular the possibility of login via digital wallet. We keep
                the data of registered users until the user account is deleted.
                A registered user can delete their accounts at any time. The
                user account also allows you to change or delete certain data
                entered during registration.
              </p>

              <h3 className="mb-3 mt-8 font-display text-lg font-semibold text-foreground">
                5.4. How much time do we keep your personal data?
              </h3>
              <p>
                We keep your personal data in accordance with the relevant
                legislation. We will keep your personal data:
              </p>
              <ul className="ml-5 list-disc space-y-1">
                <li>
                  only for as long as it is absolutely necessary to achieve the
                  purposes for which we are processing (for the purposes for
                  which we process personal data, please refer to Chapter 4.3 of
                  this Policy),
                </li>
                <li>
                  for a period prescribed by the law (we note here that the
                  deadlines for the retention of personal data may also be
                  prescribed by other laws, not only in the field of personal
                  data protection, such as 10 years for the issued invoices, in
                  accordance with the tax legislation),
                </li>
                <li>
                  for the period necessary for the fulfillment of the contract,
                  which includes guarantee periods and deadlines in which it is
                  possible to enforce any claims on the basis of a concluded
                  contract (e.g. 5 years after the fulfillment of contractual
                  obligations).
                </li>
              </ul>
              <p>
                When personal data is obtained on the basis of your consent, we
                keep it permanently or until you revoke this consent (see how to
                revoke the consent in Chapter 8 of this Policy). We will delete
                the information collected on the basis of your consent before
                your revocation, in case the purpose for which the data was
                collected has been achieved.
              </p>
              <p>
                When the retention period for certain personal data expires, we
                will delete these personal data or anonymize them so that the
                reconstruction of personal data will no longer be possible.
              </p>
              <p>
                The retention periods for each category of personal data are
                defined in Annex 1.
              </p>
              <p>
                For any additional information, please contact us at any of the
                contact details defined in Chapter 2 of this Policy.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl font-semibold text-foreground">
              6. Protection of Your Personal Data
            </h2>
            <div className="space-y-4">
              <p>
                At Skyline we protect your personal data against illegal or
                unauthorized processing and/ or access, and against
                unintentional loss, destruction or damage. We undertake all
                measures according to our technological capabilities (including
                the cost of implementing certain measures) and the impact
                assessment on your privacy.
              </p>
              <p>
                In order to ensure that your personal data is safe, we have
                undertaken the appropriate technical and organizational measures
                at Skyline, in particular:
              </p>
              <ul className="ml-5 list-disc space-y-1">
                <li>
                  ensuring the regular updating and maintenance of the hardware,
                  software and application equipment that we use for the
                  processing of personal data,
                </li>
                <li>establishing a restriction on access to personal data,</li>
                <li>regular backup,</li>
                <li>
                  ensuring the education of employees who process personal data
                  at work,
                </li>
                <li>
                  careful selection of processors that we trust for the
                  processing of personal data;
                </li>
                <li>
                  supervising both employees and processors and regular audits,
                </li>
                <li>
                  establishing protocols for preventing or limiting damage in
                  case of potential security incidents.
                </li>
              </ul>
              <p>
                In the event of a violation of the protection of personal data,
                we will notify without delay about any such violation the
                competent supervisory authority.
              </p>
              <p>
                In the event that there is a suspicion of a criminal offense
                regarding the violation of personal data, Skyline will also
                report such violations to the police and the competent state
                prosecutor’s office.
              </p>
              <p>
                In the event of a violation of data protection that may cause a
                high risk to the rights and freedoms of individuals, we will
                inform you of such an event without undue delay.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl font-semibold text-foreground">
              7. Transmitting of Personal Data
            </h2>
            <div className="space-y-4">
              <p>
                Your personal data may be, exclusively in order to achieve the
                purpose for which it was collected, transmitted, or we may just
                allow access to them to certain third parties defined below.
                Such third parties may only process your personal data for the
                purposes for which they were collected.
              </p>
              <p>
                Accordingly, any third party to whom we transmit personal data
                is bound to comply with the applicable law as well as to the
                provisions of this personal data protection policy. With
                external processors, however, the protection of personal data is
                further defined by the contract.
              </p>
              <p>Your personal data may be transmitted to:</p>
              <ul className="ml-5 list-disc space-y-1">
                <li>
                  Our external processors who take care of the needs of Skyline
                  (accounting services, law firms, companies that provide
                  marketing services, etc.) and also in order to provide our
                  services.
                </li>
                <li>
                  When this is required by the law (e.g. tax authorities,
                  courts, etc.).
                </li>
                <li>
                  In the event of Asset purchase, merger, reorganisation,
                  dissolution or similar event.
                </li>
              </ul>
              <p>
                We may transmit your personal data to third parties (defined
                above) outside the European Economic Area (EEA), where personal
                data processing occurs. In any transmission outside the European
                Economic Area, we will undertake specific additional measures to
                ensure the security of your personal data.
              </p>
              <p>
                Such measures consist mainly of agreements with third parties on
                the establishment of binding rules in the field of personal data
                protection, verification that an approved certification
                mechanism is in place, which meets our standards for the
                protection of personal data and the conclusion of relevant
                contractual obligations that regulate the protection of personal
                data.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl font-semibold text-foreground">
              8. Access to Social Networks
            </h2>
            <div className="space-y-4">
              <p>
                On our Websites we offer you the ability to use the following
                social networks: X, Discord, Telegram.
              </p>
              <p>
                The mentioned social networks operate in accordance with their
                terms of use and privacy policy, where the usage of personal
                data for each social network is also defined.
              </p>
              <p>Privacy policies are available at the links provided below:</p>
              <ul className="ml-5 list-disc space-y-1">
                <li>Twitter Cookies Help</li>
                <li>Instagram Help Center</li>
                <li>Discord Trust &amp; Safety Support</li>
                <li>Telegram Privacy Policy</li>
              </ul>
              <p>
                We would like to remind you that any use of social networks that
                is enabled on our website is in the sole responsibility of the
                individual. In the event of any questions and/or requests, an
                individual is required to contact a particular social network.
              </p>
              <p>
                Skyline does not assume any responsibility for the use of social
                networks.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl font-semibold text-foreground">
              9. Rights of Individuals
            </h2>
            <p>
              You have the following rights regarding personal data processing:
            </p>
            <div className="mt-4 space-y-5">
              <div>
                <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
                  9.1. Access to personal data
                </h3>
                <p>
                  You may request information from Skyline whether we are
                  processing your personal data, and if we do, you can request
                  access to your personal data and information about the
                  processing (which data is processed and from where this data
                  originated).
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
                  9.2. Correction of personal data
                </h3>
                <p>
                  you may request from Skyline to correct or complete your
                  incomplete or inaccurate data being processed.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
                  9.3. Restriction of the personal data processing
                </h3>
                <p>
                  you may request from Skyline a restriction of the processing
                  of your personal data (when, for example, checking the
                  accuracy or the completeness of your personal data).
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
                  9.4. Deletion of personal data
                </h3>
                <p>
                  you may request Skyline to delete your personal data (we
                  cannot delete those personal data that we keep on the basis of
                  legal requests or contractual relations).
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
                  9.5. Printout of personal data
                </h3>
                <p>
                  you may request Skyline to provide you with the personal data
                  that you have provided us with in a structured, widely used,
                  and machine-readable form.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
                  9.6. Revocation of consent
                </h3>
                <p>
                  you have the right to withdraw consent as to the use of your
                  personal data, which we collect and process on the basis of
                  consent, at any time. The consent may be revoked in any manner
                  specified in Chapter 2 of this Policy. The revocation of the
                  consent has no negative consequences, but it is possible that
                  Skyline will no longer be able to provide you with certain
                  services.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
                  9.7. Objection to the processing of personal data
                </h3>
                <p>
                  You have the right to object to the processing of your
                  personal data when processing is for direct marketing purposes
                  or in the event of transmitting your personal information to
                  third parties for the purposes of direct marketing. You can
                  also object processing when your data is used for direct
                  marketing purposes using customized or individual offers
                  (&quot;profiling&quot;). You can make an objection in any
                  manner defined in Chapter 2 of this Policy.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
                  9.8. The right to data transmission
                </h3>
                <p>
                  you have the right to request the printout of personal data
                  that you have provided us with. We will provide you with
                  information in a structured, widely used and machine-readable
                  form. You are entitled to provide this data to another
                  controller of your choice. Where technically feasible, you may
                  request that your personal data be transmitted directly to
                  another controller.
                </p>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <p>
                <strong className="text-foreground">
                  Contacts for the exercise of rights:
                </strong>
              </p>
              <p>
                If you have any questions regarding the use of this Policy or
                with regards to the exercise of your rights arising from this
                Policy, please contact us at any of the following contacts:
              </p>
              <p>
                <a
                  href="mailto:contact@skylinebridge.tech"
                  className="text-foreground hover:underline"
                >
                  contact@skylinebridge.tech
                </a>
              </p>
              <p>
                You have the right to file a complaint against us with the
                competent authority for the protection of personal data.
              </p>
              <p>
                The integrity of personal data processed and regular updating is
                a priority for Skyline. Please kindly inform us of any change of
                your personal data to the above contacts. We will take care of
                the correction or supplementing your personal data in the
                shortest possible time.
              </p>
              <p>
                In case of exercising any of the rights, we may require
                additional personal data (such as name, surname, e-mail address)
                for identification purposes. We will only need additional
                information when the information you provide is not sufficient
                for reliable identification (in this way, we want to prevent
                your personal data from being transmitted to a third party due
                to unreliable identification).
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl font-semibold text-foreground">
              10. Final Provisions
            </h2>
            <p>
              At Skyline, we can change this Policy at any time. We shall notify
              you of the change of the Policy on our website. We shall consider
              that you agree with the new version of this Policy if, after the
              new version enters into force, you continue to use our website and
              other services defined by this Policy.
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <PrivacyContent />
      </main>
      <Footer />
    </div>
  );
}
