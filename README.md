Order & Commission Manager (Canva Codes)
เว็บแอปสำหรับบันทึกออเดอร์ จัดการพนักงาน สินค้า และสรุปค่าคอมมิชชั่น โดยเชื่อมต่อ Google Sheets ผ่าน Google Apps Script (JSONP)

โครงสร้างโปรเจกต์
index.html — หน้าเว็บหลัก (พร้อม Tailwind และสคริปต์)
style.css — สไตล์เสริม (ย้ายออกจาก  ใน index.html ได้)
script.js — ล็อกิกทั้งหมด (ย้ายออกจาก  ใน index.html ได้)
หมายเหตุ: หากต้องการใช้แบบไฟล์เดียว ให้วางโค้ด index.html เวอร์ชันรวมที่ได้รับจาก Canva Code ได้ทันที

การตั้งค่า Google Sheets และ Apps Script
เตรียม Google Sheet 1 ไฟล์ (ใช้ไฟล์ที่คุณมีอยู่แล้วก็ได้)
สร้าง 3 ชีท:
Employees: id, name, commission, phone, updatedAt
Orders: orderNo, orderDate, customerName, adminName, shippingName, shippingType, shippingFee, customerAddress, grandTotal, discountTotal, thbRate, thaiAmount, itemsJSON, updatedAt
Products: id, name, weight, cost, retail, wholesale, setPrice, inQty, stock, barcode, updatedAt
ติดตั้ง Apps Script
เปิดไฟล์ชีท > Extensions > Apps Script
วางโค้ด Apps Script เวอร์ชันล่าสุดที่ได้รับจาก Canva Code (รองรับ JSONP, action-based, ไม่ต้องส่ง sheetName)
ตั้งค่าคงที่ SS_ID ให้ตรงกับไฟล์ชีทของคุณ (หากใช้ไฟล์เดิมของคุณอยู่แล้ว SS_ID ที่ให้ไปก็ตรง)
Deploy > New deployment > Select type: Web app
Who has access: Anyone (หรือ Anyone with the link)
คัดลอก URL ที่ลงท้ายด้วย /exec
ทดสอบเว็บ API (JSONP)
เปิดเบราว์เซอร์: YOUR_EXEC_URL/exec?action=listEmployees&callback=cb
หากเห็น cb({...}) แสดงว่า JSONP ใช้งานได้
การตั้งค่าในเว็บ (ครั้งแรก)
เปิด index.html ในเบราว์เซอร์
วาง Apps Script URL (/exec) ลงในช่อง “Google Apps Script URL (CFG)” แล้วกด “บันทึก”
วิธีใช้งานหลัก
ระบบพนักงาน
เพิ่ม/แก้ไข/ลบพนักงานในหน้า “ระบบพนักงาน”
กด “เรียกดูข้อมูล Google Sheet” เพื่อดึงข้อมูล
กด “บันทึกข้อมูลใน Google Sheet” เพื่ออัปโหลด
บันทึกออเดอร์
กรอกฟอร์มหรือ “วางชุดข้อความของลูกค้า” แล้วกด “แปรงข้อความ” เพื่อช่วยดึงสินค้า/ยอด/ค่าส่งโดยอัตโนมัติ
บันทึกออเดอร์ไว้ในเครื่อง (LocalStorage) แล้วค่อย “บันทึกข้อมูลใน Google Sheet” เมื่อพร้อม
สรุปค่าคอมมิชชั่น
กด “โหลดข้อมูลจาก Google Sheet” เพื่อดึง Orders และ Employees
เลือกช่วงวันที่ และเลือกพนักงาน (หรือทั้งหมด)
กด “คำนวณ”
สูตร: (grandTotal − shippingFee) × (commission% ÷ 100)
รายงานการขายประจำเดือน
โหลดข้อมูลจากชีท
เลือกช่วงเวลา แล้วกด “สรุปรายงาน”
ดูยอดรวม, นับออเดอร์, ยอดตามช่องทางขนส่ง, กำไร/ขาดทุน (คำนวณต้นทุนจากตาราง Products.cost อย่างง่าย) และ Top สินค้า
ข้อมูลสินค้า
จัดการสินค้า แล้ว Sync ขึ้นชีทได้
การแยกไฟล์ style.css และ script.js
เปิด index.html เวอร์ชันรวม
คัดลอก:
เนื้อหาใน  ไปวางใน style.css
เนื้อหาใน  ไปวางใน script.js
ปรับ index.html:
ลบแท็ก  และแทนด้วย 
ลบแท็ก  และแทนด้วย 
การดีพลอยบน GitLab Pages (ตัวอย่างเร็ว)
สร้างโปรเจกต์บน GitLab แล้วอัปโหลดไฟล์
เพิ่มไฟล์ .gitlab-ci.yml อย่างง่าย (ถ้าต้องการ Pages)
ถ้าเก็บไฟล์ไว้ที่ราก ให้ตั้ง publish ไปที่ public/
ตัวอย่าง minimal:
สร้างโฟลเดอร์ public และย้าย index.html, style.css, script.js เข้าไป
ใช้ pipeline “pages” เพื่อเผยแพร่
เปิดลิงก์ GitLab Pages ที่สร้างขึ้น ทดสอบใช้งาน
สิทธิ์และความปลอดภัย
หน้าเว็บเรียกข้อมูลผ่าน Apps Script ด้านหลัง (JSONP) เท่านั้น
อย่าแชร์ Apps Script URL สาธารณะหากมีข้อมูลจริง (เลือก Anyone with the link ตามความเหมาะสม)
หน้าเว็บเก็บสำเนาข้อมูลชั่วคราวใน LocalStorage สำหรับการทำงานแบบออฟไลน์บางส่วน
เคล็ดลับและข้อจำกัด
ทุกครั้งที่แก้โค้ด Apps Script ต้อง Deploy ใหม่ และตรวจสอบว่า URL /exec ยังเหมือนเดิมหรือไม่
หากเปลี่ยนชื่อชีท/SS_ID ให้แก้ในสคริปต์ Apps Script ให้ตรง
หาก “โหลดล้มเหลว” หน้าเว็บจะแจ้งเตือน และใช้ข้อมูลในเครื่องแทนชั่วคราว
การเล่นเสียง/ดึงรูปจากลิงก์ภายนอกไม่ได้ถูกรวมไว้
Troubleshooting
“Missing action/sheetName”:
ตรวจว่าเรียกผ่าน action=listEmployees หรือ listOrders ฯลฯ
สคริปต์ที่ให้ไปไม่ต้องส่ง sheetName ให้ใช้ action อย่างเดียว
“cb is not defined” เมื่อทดสอบ /exec:
ต้องใส่พารามิเตอร์ callback=ชื่อใดๆ เช่น ?callback=cb
“โหลด/บันทึกล้มเหลว”:
ตรวจ Apps Script URL ว่าลงท้ายด้วย /exec
ตรวจสิทธิ์ “Anyone” หรือ “Anyone with the link”
เปิดลิงก์ทดสอบ …/exec?action=listEmployees&callback=cb
