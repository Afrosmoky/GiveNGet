CREATE TABLE static_content (
    id integer primary key auto_increment,
    version integer,
    name varchar(50),
    lang varchar(10),
    content longtext,

    updated timestamp default CURRENT_TIMESTAMP
);

insert into static_content (version, name, lang, content)  values (1, 'terms-of-service', 'en', '<p style="font-size: 40px;font-weight: bold;text-align: center">Terms of Service</p>
    <h1><strong>General Site Usage</strong></h1>
    <p><strong>Last Revised: December 16, 2013</strong></p>
    <p>Welcome to www.eaty.com. This site is provided as a service to our visitors and may be used for informational purposes only. Because the Terms and Conditions contain legal obligations, please read them carefully.</p>

    <h2><strong>1. YOUR AGREEMENT</strong></h2>
    <p>By using this Site, you agree to be bound by, and to comply with, these Terms and Conditions. If you do not agree to these Terms and Conditions, please do not use this site.</p>
    <p>PLEASE NOTE: We reserve the right, at our sole discretion, to change, modify or otherwise alter these Terms and Conditions at any time. Unless otherwise indicated, amendments will become effective immediately. Please review these Terms and Conditions periodically. Your continued use of the Site following the posting of changes and/or modifications will constitute your acceptance of the revised Terms and Conditions and the reasonableness of these standards for notice of changes. For your information, this page was last updated as of the date at the top of these terms and conditions.</p>

    <h2><strong>2. PRIVACY</strong></h2>
    <p>Please review our Privacy Policy, which also governs your visit to this Site, to understand our practices.</p>

    <h2><strong>3. LINKED SITES</strong></h2>
    <p>This Site may contain links to other independent third-party Web sites ("Linked Sites”). These Linked Sites are provided solely as a convenience to our visitors. Such Linked Sites are not under our control, and we are not responsible for and does not endorse the content of such Linked Sites, including any information or materials contained on such Linked Sites. You will need to make your own independent judgment regarding your interaction with these Linked Sites.</p>

    <h2><strong>4. FORWARD LOOKING STATEMENTS</strong></h2>
    <p>All materials reproduced on this site speak as of the original date of publication or filing. The fact that a document is available on this site does not mean that the information contained in such document has not been modified or superseded by events or by a subsequent document or filing. We have no duty or policy to update any information or statements contained on this site and, therefore, such information or statements should not be relied upon as being current as of the date you access this site.</p>

    <h2><strong>5. DISCLAIMER OF WARRANTIES AND LIMITATION OF LIABILITY</strong></h2>
    <p><strong>A.</strong> THIS SITE MAY CONTAIN INACCURACIES AND TYPOGRAPHICAL ERRORS. WE DOES NOT WARRANT THE ACCURACY OR COMPLETENESS OF THE MATERIALS OR THE RELIABILITY OF ANY ADVICE, OPINION, STATEMENT OR OTHER INFORMATION DISPLAYED OR DISTRIBUTED THROUGH THE SITE. YOU EXPRESSLY UNDERSTAND AND AGREE THAT: (i) YOUR USE OF THE SITE, INCLUDING ANY RELIANCE ON ANY SUCH OPINION, ADVICE, STATEMENT, MEMORANDUM, OR INFORMATION CONTAINED HEREIN, SHALL BE AT YOUR SOLE RISK; (ii) THE SITE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS; (iii) EXCEPT AS EXPRESSLY PROVIDED HEREIN WE DISCLAIM ALL WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING, BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, WORKMANLIKE EFFORT, TITLE AND NON-INFRINGEMENT; (iv) WE MAKE NO WARRANTY WITH RESPECT TO THE RESULTS THAT MAY BE OBTAINED FROM THIS SITE, THE PRODUCTS OR SERVICES ADVERTISED OR OFFERED OR MERCHANTS INVOLVED; (v) ANY MATERIAL DOWNLOADED OR OTHERWISE OBTAINED THROUGH THE USE OF THE SITE IS DONE AT YOUR OWN DISCRETION AND RISK; and (vi) YOU WILL BE SOLELY RESPONSIBLE FOR ANY DAMAGE TO YOUR COMPUTER SYSTEM OR FOR ANY LOSS OF DATA THAT RESULTS FROM THE DOWNLOAD OF ANY SUCH MATERIAL.</p>
    <p><strong>B.</strong> YOU UNDERSTAND AND AGREE THAT UNDER NO CIRCUMSTANCES, INCLUDING, BUT NOT LIMITED TO, NEGLIGENCE, SHALL WE BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, PUNITIVE OR CONSEQUENTIAL DAMAGES THAT RESULT FROM THE USE OF, OR THE INABILITY TO USE, ANY OF OUR SITES OR MATERIALS OR FUNCTIONS ON ANY SUCH SITE, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. THE FOREGOING LIMITATIONS SHALL APPLY NOTWITHSTANDING ANY FAILURE OF ESSENTIAL PURPOSE OF ANY LIMITED REMEDY.</p>

    <h2><strong>6. EXCLUSIONS AND LIMITATIONS</strong></h2>
    <p>SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OF CERTAIN WARRANTIES OR THE LIMITATION OR EXCLUSION OF LIABILITY FOR INCIDENTAL OR CONSEQUENTIAL DAMAGES. ACCORDINGLY, OUR LIABILITY IN SUCH JURISDICTION SHALL BE LIMITED TO THE MAXIMUM EXTENT PERMITTED BY LAW.</p>

    <h2><strong>7. OUR PROPRIETARY RIGHTS</strong></h2>
    <p>This Site and all its Contents are intended solely for personal, non-commercial use. Except as expressly provided, nothing within the Site shall be construed as conferring any license under our or any third party''s intellectual property rights, whether by estoppel, implication, waiver, or otherwise. Without limiting the generality of the foregoing, you acknowledge and agree that all content available through and used to operate the Site and its services is protected by copyright, trademark, patent, or other proprietary rights. You agree not to: (a) modify, alter, or deface any of the trademarks, service marks, trade dress (collectively "Trademarks") or other intellectual property made available by us in connection with the Site; (b) hold yourself out as in any way sponsored by, affiliated with, or endorsed by us, or any of our affiliates or service providers; (c) use any of the Trademarks or other content accessible through the Site for any purpose other than the purpose for which we have made it available to you; (d) defame or disparage us, our Trademarks, or any aspect of the Site; and (e) adapt, translate, modify, decompile, disassemble, or reverse engineer the Site or any software or programs used in connection with it or its products and services.</p>
    <p>The framing, mirroring, scraping or data mining of the Site or any of its content in any form and by any method is expressly prohibited.</p>

    <h2><strong>8. INDEMNITY</strong></h2>
    <p>By using the Site web sites you agree to indemnify us and affiliated entities (collectively "Indemnities") and hold them harmless from any and all claims and expenses, including (without limitation) attorney''s fees, arising from your use of the Site web sites, your use of the Products and Services, or your submission of ideas and/or related materials to us or from any person''s use of any ID, membership or password you maintain with any portion of the Site, regardless of whether such use is authorized by you.</p>

    <h2><strong>9. COPYRIGHT AND TRADEMARK NOTICE</strong></h2>
    <p>Except our generated dummy copy, which is free to use for private and commercial use, all other text is copyrighted.generator.eaty.com © 2013, all rights reserved</p>

    <h2><strong>10. INTELLECTUAL PROPERTY INFRINGEMENT CLAIMS</strong></h2>
    <p>It is our policy to respond expeditiously to claims of intellectual property infringement. We will promptly process and investigate notices of alleged infringement and will take appropriate actions under the Digital Millennium Copyright Act ("DMCA") and other applicable intellectual property laws. Notices of claimed infringement should be directed to:</p>
    <p>generator.eaty.com</p>
    <p>contact@eaty.com</p>

    <h2><strong>11. PLACE OF PERFORMANCE</strong></h2>
    <p>This Site is controlled, operated and administered by us from our office in Kiev, Ukraine. We make no representation that materials at this site are appropriate or available for use at other locations outside of the Ukraine and access to them from territories where their contents are illegal is prohibited. If you access this Site from a location outside of the Ukraine, you are responsible for compliance with all local laws.</p>

    <h2><strong>12. GENERAL</strong></h2>
    <p><strong>A.</strong> If any provision of these Terms and Conditions is held to be invalid or unenforceable, the provision shall be removed (or interpreted, if possible, in a manner as to be enforceable), and the remaining provisions shall be enforced. Headings are for reference purposes only and in no way define, limit, construe or describe the scope or extent of such section. Our failure to act with respect to a breach by you or others does not waive our right to act with respect to subsequent or similar breaches. These Terms and Conditions set forth the entire understanding and agreement between us with respect to the subject matter contained herein and supersede any other agreement, proposals and communications, written or oral, between our representatives and you with respect to the subject matter hereof, including any terms and conditions on any of customer''s documents or purchase orders.</p>
    <p><strong>B.</strong> No Joint Venture, No Derogation of Rights. You agree that no joint venture, partnership, employment, or agency relationship exists between you and us as a result of these Terms and Conditions or your use of the Site. Our performance of these Terms and Conditions is subject to existing laws and legal process, and nothing contained herein is in derogation of our right to comply with governmental, court and law enforcement requests or requirements relating to your use of the Site or information provided to or gathered by us with respect to such use.</p>'),
    (1, 'privacy-policy', 'en', '
    <p style="font-size: 40px;font-weight: bold;text-align: center">Privacy policy</p>
    <p>At Eaty, accessible from Eaty.com, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by Eaty and how we use it.</p>
    <p>If you have additional questions or require more information about our Privacy Policy, do not hesitate to contact us.</p>
    <p>This Privacy Policy applies only to our online activities and is valid for visitors to our website with regards to the information that they shared and/or collect in Eaty. This policy is not applicable to any information collected offline or via channels other than this website. Our Privacy Policy was created with the help of the <a href="https://www.privacypolicygenerator.info/">Privacy Policy Generator</a>.</p>

    <h2><strong>Consent</strong></h2>
    <p>By using our website, you hereby consent to our Privacy Policy and agree to its terms.</p>

    <h2><strong>Information we collect</strong></h2>
    <p>The personal information that you are asked to provide, and the reasons why you are asked to provide it, will be made clear to you at the point we ask you to provide your personal information.</p>
    <p>If you contact us directly, we may receive additional information about you such as your name, email address, phone number, the contents of the message and/or attachments you may send us, and any other information you may choose to provide.</p>
    <p>When you register for an Account, we may ask for your contact information, including items such as name, company name, address, email address, and telephone number.</p>

    <h2><strong>How we use your information</strong></h2>
    <p>We use the information we collect in various ways, including to:</p>
    <ul>
        <li>Provide, operate, and maintain our website</li>
        <li>Improve, personalize, and expand our website</li>
        <li>Understand and analyze how you use our website</li>
        <li>Develop new products, services, features, and functionality</li>
        <li>Communicate with you, either directly or through one of our partners, including for customer service, to provide you with updates and other information relating to the website, and for marketing and promotional purposes</li>
        <li>Send you emails</li>
        <li>Find and prevent fraud</li>
    </ul>

    <h2><strong>Log Files</strong></h2>
    <p>Eaty follows a standard procedure of using log files. These files log visitors when they visit websites. All hosting companies do this and a part of hosting services'' analytics. The information collected by log files include internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date and time stamp, referring/exit pages, and possibly the number of clicks. These are not linked to any information that is personally identifiable. The purpose of the information is for analyzing trends, administering the site, tracking users'' movement on the website, and gathering demographic information.</p>

    <h2><strong>Cookies and Web Beacons</strong></h2>
    <p>Like any other website, Eaty uses ''cookies''. These cookies are used to store information including visitors'' preferences, and the pages on the website that the visitor accessed or visited. The information is used to optimize the users'' experience by customizing our web page content based on visitors'' browser type and/or other information.</p>
    <p>For more general information on cookies, please read <a href="https://www.privacypolicyonline.com/what-are-cookies/">"What Are Cookies"</a>.</p>

    <h2><strong>Google DoubleClick DART Cookie</strong></h2>
    <p>Google is one of a third-party vendor on our site. It also uses cookies, known as DART cookies, to serve ads to our site visitors based upon their visit to www.website.com and other sites on the internet. However, visitors may choose to decline the use of DART cookies by visiting the Google ad and content network Privacy Policy at the following URL – https://policies.google.com/technologies/ads</p>

    <h2><strong>Advertising Partners Privacy Policies</strong></h2>
    <p>You may consult this list to find the Privacy Policy for each of the advertising partners of Eaty.</p>
    <p>Third-party ad servers or ad networks uses technologies like cookies, JavaScript, or Web Beacons that are used in their respective advertisements and links that appear on Eaty, which are sent directly to users'' browser. They automatically receive your IP address when this occurs. These technologies are used to measure the effectiveness of their advertising campaigns and/or to personalize the advertising content that you see on websites that you visit.</p>
    <p>Note that Eaty has no access to or control over these cookies that are used by third-party advertisers.</p>

    <h2><strong>Third Party Privacy Policies</strong></h2>
    <p>Eaty''s Privacy Policy does not apply to other advertisers or websites. Thus, we are advising you to consult the respective Privacy Policies of these third-party ad servers for more detailed information. It may include their practices and instructions about how to opt-out of certain options.</p>
    <p>You can choose to disable cookies through your individual browser options. To know more detailed information about cookie management with specific web browsers, it can be found at the browsers'' respective websites.</p>

    <h2><strong>CCPA Privacy Rights (Do Not Sell My Personal Information)</strong></h2>
    <p>Under the CCPA, among other rights, California consumers have the right to:</p>
    <ul>
        <li>Request that a business that collects a consumer''s personal data disclose the categories and specific pieces of personal data that a business has collected about consumers.</li>
        <li>Request that a business delete any personal data about the consumer that a business has collected.</li>
        <li>Request that a business that sells a consumer''s personal data, not sell the consumer''s personal data.</li>
    </ul>
    <p>If you make a request, we have one month to respond to you. If you would like to exercise any of these rights, please contact us.</p>

    <h2><strong>GDPR Data Protection Rights</strong></h2>
    <p>We would like to make sure you are fully aware of all of your data protection rights. Every user is entitled to the following:</p>
    <ul>
        <li>The right to access – You have the right to request copies of your personal data. We may charge you a small fee for this service.</li>
        <li>The right to rectification – You have the right to request that we correct any information you believe is inaccurate. You also have the right to request that we complete the information you believe is incomplete.</li>
        <li>The right to erasure – You have the right to request that we erase your personal data, under certain conditions.</li>
        <li>The right to restrict processing – You have the right to request that we restrict the processing of your personal data, under certain conditions.</li>
        <li>The right to object to processing – You have the right to object to our processing of your personal data, under certain conditions.</li>
        <li>The right to data portability – You have the right to request that we transfer the data that we have collected to another organization, or directly to you, under certain conditions.</li>
    </ul>
    <p>If you make a request, we have one month to respond to you. If you would like to exercise any of these rights, please contact us.</p>

    <h2><strong>Children''s Information</strong></h2>
    <p>Another part of our priority is adding protection for children while using the internet. We encourage parents and guardians to observe, participate in, and/or monitor and guide their online activity.</p>
    <p>Eaty does not knowingly collect any Personal Identifiable Information from children under the age of 13. If you think that your child provided this kind of information on our website, we strongly encourage you to contact us immediately and we will do our best efforts to promptly remove such information from our records.</p>');