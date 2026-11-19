import React from 'react';
import { ArrowLeft, ShieldCheck, MessageSquare } from 'lucide-react';

const POLICY = {
  ka: {
    title: 'კონფიდენციალურობის პოლიტიკა',
    subtitle: 'როგორ ვამუშავებთ და ვიცავთ GEOSTORE-ის მომხმარებლების პირად ინფორმაციას',
    updated: 'ბოლო განახლება: 19 ნოემბერი, 2026',
    back: 'მაღაზიაში დაბრუნება',
    contact: 'მონაცემებთან დაკავშირებული შეკითხვისთვის მოგვწერეთ მხარდაჭერის ჩატში',
    contactButton: 'მხარდაჭერასთან დაკავშირება',
    sections: [
      {
        title: '1. ვინ ამუშავებს მონაცემებს',
        paragraphs: [
          'GEOSTORE არის ონლაინ სავაჭრო პლატფორმა. პლატფორმის ოპერატორი ამუშავებს მომხმარებლის მონაცემებს ამ პოლიტიკაში აღწერილი მიზნებით. მონაცემთა დაცვის საკითხებზე მოგვმართეთ GEOSTORE-ის მხარდაჭერის ჩატის საშუალებით.'
        ]
      },
      {
        title: '2. რა ინფორმაციას ვაგროვებთ',
        paragraphs: [
          'ანგარიშის მონაცემები: სახელი, ელფოსტა და ანგარიშის ტექნიკური იდენტიფიკატორი. პაროლის ავთენტიფიკაციას ამუშავებს Supabase Auth; GEOSTORE მომხმარებლის პაროლს ღია ტექსტის სახით არ ინახავს.',
          'შეკვეთის მონაცემები: მიმღების სახელი, ტელეფონი, ელფოსტა (თუ მიუთითებთ), მიწოდების მისამართი და რეგიონი, შეკვეთის ნომერი, პროდუქტები, არჩეული ზომა/ფერი, რაოდენობა, ფასი და სტატუსი.',
          'მხარდაჭერის მონაცემები: ჩატში ან მხარდაჭერის მოთხოვნაში გამოგზავნილი ტექსტი და შეკვეთასთან დაკავშირებული ინფორმაცია.',
          'ბრაუზერის მონაცემები: კალათა, ფავორიტები, შედარების სია და ენის/ინტერფეისის ზოგიერთი პარამეტრი შეიძლება შეინახოს თქვენს მოწყობილობაზე ბრაუზერის ლოკალურ საცავში.',
          'ტექნიკური და უსაფრთხოების მონაცემები: სერვისის მუშაობის, შეცდომების აღმოჩენისა და ბოროტად გამოყენების პრევენციისთვის საჭირო ტექნიკური ჩანაწერები.'
        ],
        note: 'მიმდინარე შეკვეთის ფორმა საბანკო ბარათის ნომერს არ ითხოვს.'
      },
      {
        title: '3. რატომ ვიყენებთ ინფორმაციას',
        bullets: [
          'ანგარიშის შექმნისა და ავტორიზაციისთვის;',
          'შეკვეთის მისაღებად, დასამუშავებლად და მისაწოდებლად;',
          'მომხმარებლის მხარდაჭერისა და შეკვეთის სტატუსის გასაახლებლად;',
          'პლატფორმის უსაფრთხოების, თაღლითობის პრევენციისა და ტექნიკური გამართულობისთვის;',
          'კანონით გათვალისწინებული ვალდებულებების შესასრულებლად და დავების მოსაგვარებლად.'
        ]
      },
      {
        title: '4. დამუშავების საფუძველი',
        paragraphs: [
          'მონაცემებს ვამუშავებთ შეკვეთისა და ანგარიშის მომსახურების უზრუნველსაყოფად, თქვენი თანხმობის საფუძველზე იქ, სადაც ის საჭიროა, პლატფორმის უსაფრთხოებისა და გამართული მუშაობის ლეგიტიმური ინტერესით და მოქმედი კანონმდებლობით დაკისრებული ვალდებულებების შესასრულებლად.'
        ]
      },
      {
        title: '5. ვის შეიძლება გაეზიაროს მონაცემები',
        paragraphs: [
          'ტექნიკური მომსახურებისთვის ვიყენებთ Supabase-ს (ავთენტიფიკაცია, მონაცემთა ბაზა და სერვერული ფუნქციები) და Vercel-ს (ჰოსტინგი და განთავსება). შეკვეთის შესრულების აუცილებლობისას შესაბამისი ინფორმაცია შეიძლება გადაეცეს შეკვეთაში ჩართულ გამყიდველს ან მიწოდების პარტნიორს — მხოლოდ საჭირო მოცულობით.',
          'პირად მონაცემებს არ ვყიდით. მომსახურების მომწოდებლები მონაცემებს ამუშავებენ საკუთარი მომსახურების პირობებისა და უსაფრთხოების ზომების შესაბამისად.'
        ]
      },
      {
        title: '6. მონაცემთა საერთაშორისო გადაცემა',
        paragraphs: [
          'ტექნიკური მომწოდებლების ინფრასტრუქტურა შეიძლება მდებარეობდეს საქართველოს ფარგლებს გარეთ. ასეთ შემთხვევაში მონაცემთა გადაცემა უნდა განხორციელდეს მოქმედი კანონმდებლობით გათვალისწინებული შესაბამისი დაცვის გარანტიების დაცვით.'
        ]
      },
      {
        title: '7. შენახვის ვადა',
        paragraphs: [
          'მონაცემებს ვინახავთ იმ ვადით, რაც საჭიროა შეკვეთის, ანგარიშისა და მხარდაჭერის მომსახურებისთვის, ასევე კანონით გათვალისწინებული საბუღალტრო, საგადასახადო და დავის გადაწყვეტის ვალდებულებებისთვის. ბრაუზერის ლოკალურ საცავში შენახული პარამეტრები შეგიძლიათ წაშალოთ თქვენი მოწყობილობის ბრაუზერის პარამეტრებიდან.'
        ]
      },
      {
        title: '8. უსაფრთხოება',
        paragraphs: [
          'ვიყენებთ წვდომის შეზღუდვას, სერვერულ უფლებების შემოწმებას და კავშირის დაცვის ტექნიკურ მექანიზმებს. მიუხედავად ამისა, ინტერნეტით მონაცემთა გადაცემის ან ელექტრონული შენახვის აბსოლუტური უსაფრთხოების გარანტირება შეუძლებელია.'
        ]
      },
      {
        title: '9. თქვენი უფლებები',
        paragraphs: [
          'მოქმედი კანონმდებლობის ფარგლებში შეგიძლიათ მოითხოვოთ ინფორმაცია თქვენი მონაცემების დამუშავების შესახებ, მათი გაცნობა, გასწორება, განახლება ან წაშლა, ასევე მოითხოვოთ დამუშავების შეზღუდვა ან გააპროტესტოთ იგი. თუ დამუშავება თანხმობას ეფუძნება, შეგიძლიათ თანხმობა უკან გაიწვიოთ.'
        ],
        note: 'მოთხოვნის გასაგზავნად გამოიყენეთ საიტის მხარდაჭერის ჩატი. შესაძლოა დაგვჭირდეს თქვენი ვინაობის გადამოწმება, რათა მონაცემები მესამე პირს არ გავუმჟღავნოთ.'
      },
      {
        title: '10. ბავშვების მონაცემები',
        paragraphs: [
          'GEOSTORE განკუთვნილია იმ მომხმარებლებისთვის, რომლებსაც შეუძლიათ დამოუკიდებლად დადონ ონლაინ შესყიდვის ხელშეკრულება. თუ ფიქრობთ, რომ არასრულწლოვნის მონაცემები შესაბამისი უფლებამოსილების გარეშე მოგვაწოდეს, დაგვიკავშირდით მხარდაჭერის ჩატში.'
        ]
      },
      {
        title: '11. პოლიტიკის ცვლილება და კონტაქტი',
        paragraphs: [
          'პოლიტიკა შეიძლება განახლდეს პლატფორმის ფუნქციების ან სამართლებრივი მოთხოვნების ცვლილებისას. განახლებული ვერსია გამოქვეყნდება ამავე გვერდზე და მიეთითება ცვლილების თარიღი.',
          'კონფიდენციალურობის საკითხებზე დაგვიკავშირდით GEOSTORE-ის მხარდაჭერის ჩატის საშუალებით.'
        ]
      }
    ]
  },
  en: {
    title: 'Privacy Policy',
    subtitle: 'How GEOSTORE processes and protects customers’ personal information',
    updated: 'Last updated: 19 November 2026',
    back: 'Back to store',
    contact: 'For questions about your data, contact us through the support chat',
    contactButton: 'Contact support',
    sections: [
      { title: '1. Who processes your data', paragraphs: ['GEOSTORE is an online marketplace. The platform operator processes customer information for the purposes described in this policy. For privacy requests, contact us through GEOSTORE support chat.'] },
      { title: '2. Information we collect', paragraphs: [
        'Account information: name, email address and a technical account identifier. Password authentication is handled by Supabase Auth; GEOSTORE does not store your password in plain text.',
        'Order information: recipient name, phone number, email (if provided), delivery address and region, order number, products, selected size/color, quantity, price and order status.',
        'Support information: messages submitted through chat or support requests, including information related to an order.',
        'Browser information: your cart, wishlist, comparison list and certain language/interface preferences may be stored locally in your browser.',
        'Technical and security information: technical records needed to operate the service, diagnose errors and prevent abuse.'
      ], note: 'The current checkout form does not request bank card numbers.' },
      { title: '3. Why we use information', bullets: [
        'To create and authenticate accounts;',
        'To receive, process and deliver orders;',
        'To provide customer support and update order status;',
        'To secure, maintain and improve the platform and prevent fraud;',
        'To meet legal obligations and resolve disputes.'
      ] },
      { title: '4. Legal grounds', paragraphs: ['We process information to provide account and order services, based on your consent where required, our legitimate interests in keeping the platform secure and operational, and applicable legal obligations.'] },
      { title: '5. Who may receive information', paragraphs: [
        'We use Supabase for authentication, database and server-side functions, and Vercel for hosting and deployment. Where necessary to fulfil an order, relevant information may be shared with the seller involved in that order or a delivery partner, limited to what is needed.',
        'We do not sell personal information. Service providers process information under their service terms and security measures.'
      ] },
      { title: '6. International transfers', paragraphs: ['The infrastructure of technical service providers may be located outside Georgia. Where information is transferred internationally, the transfer should be protected by safeguards required under applicable law.'] },
      { title: '7. Retention', paragraphs: ['We retain information for as long as needed to provide account, order and support services and to meet accounting, tax, legal and dispute-resolution obligations. Browser-local preferences can be removed through your device or browser settings.'] },
      { title: '8. Security', paragraphs: ['We use access restrictions, server-side permission checks and technical connection safeguards. However, no method of internet transmission or electronic storage can be guaranteed to be completely secure.'] },
      { title: '9. Your rights', paragraphs: ['Subject to applicable law, you may request information about the processing of your data, access, correction, updating or deletion, restriction of processing, or object to processing. Where processing is based on consent, you may withdraw that consent.'], note: 'Submit requests through the website support chat. We may need to verify your identity to prevent disclosure to another person.' },
      { title: '10. Children', paragraphs: ['GEOSTORE is intended for people able to enter into an online purchase contract. If you believe a minor’s information was provided without appropriate authority, contact us through support chat.'] },
      { title: '11. Changes and contact', paragraphs: ['This policy may be updated when platform features or legal requirements change. The updated version and revision date will be published on this page.', 'For privacy questions, contact GEOSTORE through the website support chat.'] }
    ]
  },
  ru: {
    title: 'Политика конфиденциальности',
    subtitle: 'Как GEOSTORE обрабатывает и защищает персональные данные покупателей',
    updated: 'Последнее обновление: 19 ноября 2026 г.',
    back: 'Вернуться в магазин',
    contact: 'По вопросам обработки данных напишите нам в чат поддержки',
    contactButton: 'Связаться с поддержкой',
    sections: [
      { title: '1. Кто обрабатывает данные', paragraphs: ['GEOSTORE — онлайн-площадка для покупок. Оператор платформы обрабатывает данные пользователей для целей, описанных в этой политике. По вопросам конфиденциальности свяжитесь с нами через чат поддержки GEOSTORE.'] },
      { title: '2. Какие данные мы собираем', paragraphs: [
        'Данные аккаунта: имя, адрес электронной почты и технический идентификатор аккаунта. Аутентификацию пароля обрабатывает Supabase Auth; GEOSTORE не хранит пароль в открытом виде.',
        'Данные заказа: имя получателя, телефон, электронная почта (если указана), адрес и регион доставки, номер заказа, товары, выбранный размер/цвет, количество, цена и статус заказа.',
        'Данные поддержки: сообщения, отправленные через чат или обращения в поддержку, включая сведения о заказе.',
        'Данные браузера: корзина, избранное, список сравнения и некоторые языковые/интерфейсные настройки могут храниться локально в браузере.',
        'Технические и защитные данные: технические записи, необходимые для работы сервиса, диагностики ошибок и предотвращения злоупотреблений.'
      ], note: 'Текущая форма оформления заказа не запрашивает номер банковской карты.' },
      { title: '3. Для чего мы используем данные', bullets: [
        'Для создания аккаунта и аутентификации;',
        'Для приёма, обработки и доставки заказов;',
        'Для поддержки покупателей и обновления статуса заказа;',
        'Для защиты и улучшения платформы, предотвращения мошенничества;',
        'Для выполнения требований закона и разрешения споров.'
      ] },
      { title: '4. Основания обработки', paragraphs: ['Мы обрабатываем данные для предоставления услуг аккаунта и заказа, на основании вашего согласия там, где оно требуется, наших законных интересов в обеспечении безопасности и работы платформы, а также применимых требований закона.'] },
      { title: '5. Кому могут передаваться данные', paragraphs: [
        'Для аутентификации, базы данных и серверных функций мы используем Supabase, а для хостинга и размещения — Vercel. Если это необходимо для выполнения заказа, соответствующие данные могут быть переданы продавцу, участвующему в заказе, или службе доставки — только в необходимом объёме.',
        'Мы не продаём персональные данные. Поставщики услуг обрабатывают данные в соответствии со своими условиями и мерами безопасности.'
      ] },
      { title: '6. Международная передача', paragraphs: ['Инфраструктура технических поставщиков может находиться за пределами Грузии. При международной передаче должны применяться гарантии защиты, предусмотренные действующим законодательством.'] },
      { title: '7. Срок хранения', paragraphs: ['Мы храним данные столько, сколько необходимо для обслуживания аккаунта, заказа и поддержки, а также для выполнения бухгалтерских, налоговых, юридических обязательств и разрешения споров. Локальные настройки браузера можно удалить в настройках устройства или браузера.'] },
      { title: '8. Безопасность', paragraphs: ['Мы применяем ограничения доступа, серверные проверки разрешений и технические меры защиты соединения. Однако ни один способ передачи данных через интернет или электронного хранения не может гарантировать абсолютную безопасность.'] },
      { title: '9. Ваши права', paragraphs: ['В рамках применимого законодательства вы можете запросить информацию об обработке данных, доступ к ним, исправление, обновление или удаление, ограничение обработки либо возразить против неё. Если обработка основана на согласии, вы можете отозвать его.'], note: 'Отправьте запрос через чат поддержки сайта. Для защиты данных мы можем попросить подтвердить вашу личность.' },
      { title: '10. Данные детей', paragraphs: ['GEOSTORE предназначен для лиц, способных самостоятельно заключать договор онлайн-покупки. Если вы считаете, что данные несовершеннолетнего были предоставлены без надлежащих полномочий, обратитесь в чат поддержки.'] },
      { title: '11. Изменения и связь', paragraphs: ['Политика может обновляться при изменении функций платформы или требований законодательства. Новая версия и дата обновления будут опубликованы на этой странице.', 'По вопросам конфиденциальности свяжитесь с GEOSTORE через чат поддержки сайта.'] }
    ]
  }
};

export default function PrivacyPolicyPage({ currentLang = 'ka', onClose, onContact }) {
  const copy = POLICY[currentLang] || POLICY.ka;

  return (
    <article className="gs-privacy-page mx-auto w-full max-w-4xl space-y-5 text-slate-100" aria-labelledby="gs-privacy-title">
      <header className="rounded-3xl border border-emerald-500/20 bg-slate-950/90 p-5 shadow-xl sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-emerald-300">
            <ShieldCheck className="h-4 w-4" /> GEOSTORE / PRIVACY
          </span>
          <button type="button" onClick={onClose} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-slate-200 transition hover:border-emerald-400/40 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> {copy.back}
          </button>
        </div>
        <h1 id="gs-privacy-title" className="mt-5 text-2xl font-black tracking-tight text-white sm:text-3xl">{copy.title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{copy.subtitle}</p>
        <p className="mt-4 text-[11px] font-semibold text-slate-500">{copy.updated}</p>
      </header>

      <div className="space-y-3">
        {copy.sections.map((section, index) => (
          <section key={section.title} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
            <h2 className="text-sm font-black text-emerald-200 sm:text-base">{section.title}</h2>
            {section.paragraphs?.map((paragraph, paragraphIndex) => (
              <p key={paragraphIndex} className="mt-3 text-xs leading-6 text-slate-300 sm:text-sm">{paragraph}</p>
            ))}
            {section.bullets && (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-6 text-slate-300 sm:text-sm">
                {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
              </ul>
            )}
            {section.note && (
              <p className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs leading-5 text-amber-100">{section.note}</p>
            )}
          </section>
        ))}
      </div>

      <footer className="rounded-2xl border border-emerald-500/20 bg-slate-950/80 p-5 text-center">
        <p className="text-xs leading-6 text-slate-300">{copy.contact}</p>
        <button type="button" onClick={onContact} className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-xs font-black text-slate-950 transition hover:bg-emerald-400">
          <MessageSquare className="h-4 w-4" /> {copy.contactButton}
        </button>
      </footer>
    </article>
  );
}
