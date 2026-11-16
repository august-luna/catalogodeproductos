ALTER TABLE tb_usuarios
  ADD COLUMN rol ENUM('usuario', 'admin') NOT NULL DEFAULT 'usuario'
  AFTER activo;
