# Test Credentials - BoltUbuntu

## Admin User
- **Email**: admin@dashboard.local
- **Password**: admin123
- **Role**: Admin User

## API Authentication
- JWT Token based
- Token expires in 7 days
- Header: `Authorization: Bearer <token>`

## Login Endpoint
```bash
curl -X POST http://localhost:3061/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@dashboard.local","password":"admin123"}'
```
