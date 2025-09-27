# OAuth connect in browser (manual step described as a comment):
# 1) Open https://aktonz.com/admin and click “Connect to Microsoft”, sign in as info@aktonz.com; expect redirect to /admin?connected=1

# API endpoint tests (adjust domain for preview/prod as needed):
curl -X POST https://aktonz.com/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","message":"Hello from Aktonz"}'

curl -X POST https://aktonz.com/api/book-viewing \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"t@example.com","phone":"+44 7000 000000","propertyId":"AKT-123","preferredTime":"Tomorrow 2pm"}'

curl -X POST https://aktonz.com/api/offers \
  -H "Content-Type: application/json" \
  -d '{"name":"Buyer","email":"b@example.com","phone":"+44 7000 000001","offerAmount":350000,"propertyId":"AKT-456","notes":"Cash buyer"}'

curl -X POST https://aktonz.com/api/valuations \
  -H "Content-Type: application/json" \
  -d '{"name":"Owner","email":"o@example.com","phone":"+44 7000 000002","address":"33 Abersham Road, London E8 2LN","details":"2-bed flat"}'
