const labels={
 ka:{disabled:'სინქრონიზაცია გამორთულია',queued:'ცვლილება შენახულია მოწყობილობაზე',offline:'ინტერნეტი მიუწვდომელია — ცვლილება შენახულია',busy:'სხვა ჩანართში მიმდინარეობს სინქრონიზაცია',review:'საჭიროა ცვლილებების გადამოწმება',conflict:'სხვა მოწყობილობაზე მონაცემები შეიცვალა',uncertain:'სერვერის პასუხი დაუდასტურებელია',unsupported:'ამ ბრაუზერში უსაფრთხო სინქრონიზაცია მიუწვდომელია',blocked:'სინქრონიზაცია ვერ შესრულდა',ready:'სერვერის მონაცემები მიღებულია',accepted:'ცვლილება დადასტურებულია',changed:'ცვლილება დადასტურებულია',unchanged:'ცვლილება დადასტურებულია'},
 en:{disabled:'Sync is disabled',queued:'Change saved on this device',offline:'Offline — change saved on this device',busy:'Another tab is syncing',review:'Review changes before syncing',conflict:'Data changed on another device',uncertain:'Server confirmation is pending',unsupported:'Safe sync is unavailable in this browser',blocked:'Sync could not complete',ready:'Server data received',accepted:'Change confirmed',changed:'Change confirmed',unchanged:'Change confirmed'},
 ru:{disabled:'Синхронизация отключена',queued:'Изменение сохранено на устройстве',offline:'Нет сети — изменение сохранено',busy:'Синхронизация в другой вкладке',review:'Проверьте изменения перед синхронизацией',conflict:'Данные изменены на другом устройстве',uncertain:'Подтверждение сервера не получено',unsupported:'Безопасная синхронизация недоступна в этом браузере',blocked:'Не удалось выполнить синхронизацию',ready:'Данные сервера получены',accepted:'Изменение подтверждено',changed:'Изменение подтверждено',unchanged:'Изменение подтверждено'}
};
export function getCustomerSyncStatus(status,lang='ka'){
 const dictionary=labels[lang]||labels.ka;
 const normalized=Object.hasOwn(dictionary,status)?status:'blocked';
 return {text:dictionary[normalized],attention:['review','conflict','uncertain','unsupported','blocked'].includes(normalized)};
}
