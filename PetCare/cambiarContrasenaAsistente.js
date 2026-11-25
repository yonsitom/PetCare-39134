const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
  'a4bdb7cd-93c8-4664-9997-3bef47f33361',
  {
    password: 'Segura123!'
  }
);

if (error) {
  console.error('Error:', error.message);
} else {
  console.log('Contraseña actualizada correctamente');
}