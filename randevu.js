let currentDate = new Date(); // Takvimdeki geçerli ay/yıl bilgisi

$(document).ready(function () {
    // Takvimi başlat
    initializeCalendar();
    loadAppointments();

    // Formun submit olayını dinle
    $('#randevuForm').on('submit', function (e) {
        e.preventDefault();
        handleFormSubmit();
    });

    // Takvimde bir güne tıklama
    $(document).on('click', '.day', function () {
        const selectedDay = parseInt($(this).text());
        if (!isNaN(selectedDay)) {
            handleDayClick(selectedDay);
        }
    });

    // Ay geçiş butonları
    $('#prevMonth').click(function () {
        changeMonth(-1); // Bir önceki ay
    });

    $('#nextMonth').click(function () {
        changeMonth(1); // Bir sonraki ay
    });
});

/**
 * Takvimi başlatır ve ay günlerini oluşturur
 */
function initializeCalendar() {
    const monthNames = [
        "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
        "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
    ];

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Ay başlığını güncelle
    $('#currentMonth').text(`${monthNames[month]} ${year}`);

    // Günleri oluştur
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();

    let dayCells = '';
    for (let i = 0; i < firstDayIndex; i++) {
        dayCells += '<div class="day empty"></div>'; // Boş günler
    }
    for (let day = 1; day <= daysInMonth; day++) {
        dayCells += `<div class="day">${day}</div>`; // Gerçek günler
    }
    $('#month-days').html(dayCells);
}

/**
 * Ay geçişini sağlar (bir önceki veya bir sonraki ay)
 * @param {number} change - Ay değişim miktarı (-1 bir önceki ay, 1 bir sonraki ay)
 */
function changeMonth(change) {
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Yeni ay ve yıl hesapla
    let newMonth = currentMonth + change;
    let newYear = currentYear;

    if (newMonth < 0) {
        newMonth = 11;
        newYear--;
    } else if (newMonth > 11) {
        newMonth = 0;
        newYear++;
    }

    currentDate = new Date(newYear, newMonth);
    initializeCalendar();
}

/**
 * Bir güne tıklanıldığında yapılacak işlemler
 * @param {number} selectedDay - Seçilen gün
 */
function handleDayClick(selectedDay) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);  // Bugünün tarihini saat kısmı olmadan alıyoruz
    
    const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay);

    // Seçilen tarihi yerel saat dilimine göre güncelle
    selectedDate.setHours(0, 0, 0, 0); // Saat, dakika, saniye ve milisaniye sıfırlanır

    // Eğer seçilen tarih geçmiş bir tarihse
    if (selectedDate < today) {
        alert("Geçmiş bir günde randevu ekleyemezsiniz!");
        return;  // Randevu eklemeye devam etme
    }

    // Seçilen tarihte zaten randevu olup olmadığını kontrol et
    checkForAppointmentOnSelectedDate(selectedDate, function(isAppointmentExist) {
        if (isAppointmentExist) {
            alert("Bu tarihte zaten bir randevu var, lütfen başka bir tarih seçin.");
            return;  // Aynı güne randevu eklemeyi engelle
        }

        const title = prompt(`${selectedDate.toLocaleDateString()} için randevu başlığı girin:`);

        if (title) {
            // Seçilen tarihi yerel zaman diliminde alıyoruz
            const localStartDate = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000); // UTC'den yerel zamana çevirme
            const localEndDate = new Date(localStartDate.getTime());
            localEndDate.setHours(localStartDate.getHours() + 1); // Bitiş saatini 1 saat sonrasına ayarlıyoruz

            const start_time = `${localStartDate.toISOString().split("T")[0]}T${localStartDate.toISOString().split("T")[1].substring(0, 5)}`;
            const end_time = `${localEndDate.toISOString().split("T")[0]}T${localEndDate.toISOString().split("T")[1].substring(0, 5)}`;

            const appointmentData = {
                title,
                start_time,
                end_time,
                description: "Takvimden eklenmiş randevu"
            };

            sendAppointmentToBackend(appointmentData);
        }
    });
}

/**
 * Seçilen tarihte randevu olup olmadığını kontrol eder
 * @param {Date} selectedDate - Seçilen tarih
 * @param {Function} callback - Tarihte randevu varsa true, yoksa false döner
 */
function checkForAppointmentOnSelectedDate(selectedDate, callback) {
    $.ajax({
        url: 'http://localhost:3000/appointments',
        method: 'GET',
        success: function (appointments) {
            let isAppointmentExist = false;

            appointments.forEach(appointment => {
                const existingStart = new Date(appointment.start_time);
                const existingEnd = new Date(appointment.end_time);

                // Eğer seçilen tarih aralığı ile mevcut randevu çakışıyorsa
                if (selectedDate.toISOString().split("T")[0] === existingStart.toISOString().split("T")[0]) {
                    isAppointmentExist = true;
                }
            });

            callback(isAppointmentExist);  // Callback ile sonucu döndür
        },
        error: function () {
            alert("Randevular yüklenirken bir hata oluştu.");
        }
    });
}

/**
 * Formdan alınan verileri işler ve backend'e gönderir
 */
function handleFormSubmit() {
    const title = $('#title').val();
    const start_time = $('#start_time').val();
    const end_time = $('#end_time').val();
    const description = $('#description').val() || "";

    // Tarih sırası kontrolü
    const startDate = new Date(start_time);
    const endDate = new Date(end_time);

    // Geçmiş tarih kontrolü
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Bugün saat kısmını sıfırlıyoruz

    if (startDate < today) {
        alert("Geçmiş bir tarihte randevu eklenemez!");
        return; // Geçmiş tarihse randevu eklemeyi engelle
    }

    if (endDate < today) {
        alert("Geçmiş bir tarihte randevu eklenemez!");
        return; // Geçmiş tarihse randevu eklemeyi engelle
    }

    if (startDate >= endDate) {
        alert("Bitiş zamanı başlangıç zamanından önce olamaz!");
        return;
    }

    checkForDateConflict(start_time, end_time, function (hasConflict) {
        if (hasConflict) {
            alert("Seçtiğiniz tarihlerde bir randevu zaten var. Lütfen farklı bir zaman dilimi seçin.");
        } else {
            const appointmentData = { title, start_time, end_time, description };
            sendAppointmentToBackend(appointmentData);
            loadAppointments();
        }
    });
}

/**
 * Backend'e yeni randevu ekleme isteği gönderir
 * @param {Object} appointmentData - Randevu verileri
 */
function sendAppointmentToBackend(appointmentData) {
    $.ajax({
        url: 'http://localhost:3000/add-appointment',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(appointmentData),
        success: function (response) {
            alert("Randevunuz başarıyla eklendi!");
            loadAppointments();
        },
        error: function () {
            alert("Randevu eklenirken bir hata oluştu.");
        }
    });
}

/**
 * Randevuları backend'den yükler ve ekrana listeler
 */
function loadAppointments() {
    $.ajax({
        url: 'http://localhost:3000/appointments',
        method: 'GET',
        success: function (appointments) {
            const appointmentList = $('#appointments');
            appointmentList.empty();

            appointments.forEach(appointment => {
                const startDate = new Date(appointment.start_time);
                const endDate = new Date(appointment.end_time);

                const listItem = `<li>
                    <strong>${appointment.title}</strong> 
                    (${startDate.toLocaleString()} - ${endDate.toLocaleString()})
                </li>`;
                appointmentList.append(listItem);
            });
        },
        error: function () {
            alert("Randevular yüklenirken bir hata oluştu.");
        }
    });
}

/**
 * Tarih çakışması kontrolü yapar
 */
function checkForDateConflict(newStartTime, newEndTime, callback) {
    $.ajax({
        url: 'http://localhost:3000/appointments',
        method: 'GET',
        success: function (appointments) {
            let hasConflict = false;
            const newStart = new Date(newStartTime);
            const newEnd = new Date(newEndTime);

            appointments.forEach(appointment => {
                const existingStart = new Date(appointment.start_time);
                const existingEnd = new Date(appointment.end_time);

                if (newStart < existingEnd && newEnd > existingStart) {
                    hasConflict = true;
                }
            });

            callback(hasConflict);
        }
    });
}
