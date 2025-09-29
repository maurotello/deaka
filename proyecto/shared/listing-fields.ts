// 1. Definimos una estructura para un campo de formulario
export interface FormField {
  key: string;       // El nombre que se guardará en el JSONB (ej: "company_name")
  label: string;     // El texto que verá el usuario (ej: "Nombre de la Empresa")
  type: 'text' | 'textarea' | 'email' | 'tel' | 'url' | 'number' | 'image' | 'gallery' | 'select'; // Tipo de input
  placeholder?: string; // Texto de ejemplo en el campo
  options?: string[]; // Opciones para el tipo 'select'
}

// 2. Definimos los campos para CADA tipo de listado
const eventFields: FormField[] = [
  { key: 'description', label: 'Descripción Detallada', type: 'textarea', placeholder: 'Describe el evento a fondo...' },
  { key: 'event_image', label: 'Imagen Principal del Evento', type: 'image' },
  { key: 'cover_image', label: 'Imagen de Portada (Banner)', type: 'image' },
  { key: 'gallery', label: 'Galería de Imágenes', type: 'gallery' },
  { key: 'contact_name', label: 'Nombre del Contacto', type: 'text', placeholder: 'Juan Pérez' },
  { key: 'contact_phone', label: 'Teléfono de Contacto', type: 'tel', placeholder: '2920-123456' },
  { key: 'contact_email', label: 'Email de Contacto', type: 'email', placeholder: 'contacto@evento.com' },
  { key: 'event_details', label: 'Detalles Adicionales', type: 'textarea', placeholder: 'Ej: Se suspende por lluvia, traer reposera...' },
  { key: 'tags', label: 'Etiquetas', type: 'text', placeholder: 'música, rock, aire-libre (separadas por coma)' },
];

const jobFields: FormField[] = [
  { key: 'company_name', label: 'Nombre de la Empresa', type: 'text', placeholder: 'Mi Empresa S.A.' },
  { key: 'company_logo', label: 'Logo de la Empresa', type: 'image' },
  { key: 'job_type', label: 'Tipo de Empleo', type: 'select', options: ['Jornada Completa', 'Media Jornada', 'Por Horas', 'Remoto'] },
  { key: 'salary_range', label: 'Rango Salarial (opcional)', type: 'text', placeholder: '$150.000 - $200.000 ARS' },
  { key: 'responsibilities', label: 'Responsabilidades', type: 'textarea', placeholder: 'Detalla las tareas del puesto...' },
  { key: 'requirements', label: 'Requisitos', type: 'textarea', placeholder: 'Enumera los requisitos para los aplicantes...' },
  { key: 'company_website', label: 'Sitio Web de la Empresa', type: 'url', placeholder: 'https://miempresa.com' },
];

const realEstateFields: FormField[] = [
    { key: 'property_type', label: 'Tipo de Propiedad', type: 'select', options: ['Casa', 'Departamento', 'Terreno', 'Local Comercial'] },
    { key: 'status', label: 'Estado', type: 'select', options: ['En Venta', 'En Alquiler', 'Alquiler Temporario'] },
    { key: 'price', label: 'Precio (en ARS)', type: 'number', placeholder: '5000000' },
    { key: 'bedrooms', label: 'Dormitorios', type: 'number', placeholder: '3' },
    { key: 'bathrooms', label: 'Baños', type: 'number', placeholder: '2' },
    { key: 'surface_area', label: 'Superficie (m²)', type: 'number', placeholder: '120' },
    { key: 'gallery', label: 'Galería de Fotos', type: 'gallery' },
];

const placeFields: FormField[] = [
  { key: 'description', label: 'Descripción Detallada', type: 'textarea', placeholder: 'Describe el lugar, sus servicios, etc.' },
  { key: 'phone', label: 'Teléfono Principal', type: 'tel', placeholder: '2920-420000' },
  { key: 'website', label: 'Sitio Web', type: 'url', placeholder: 'https://minegocio.com' },
  { key: 'opening_hours', label: 'Horario de Atención', type: 'textarea', placeholder: 'Lunes a Viernes: 9 a 18hs...' },
  { key: 'gallery', label: 'Galería de Fotos', type: 'gallery' },
  { key: 'amenities', label: 'Servicios y Comodidades', type: 'text', placeholder: 'wifi, estacionamiento, accesible (separados por coma)' },
];

const vehicleFields: FormField[] = [
    { key: 'make', label: 'Marca', type: 'text', placeholder: 'Ford' },
    { key: 'model', label: 'Modelo', type: 'text', placeholder: 'Ranger' },
    { key: 'year', label: 'Año', type: 'number', placeholder: '2022' },
    { key: 'mileage', label: 'Kilometraje', type: 'number', placeholder: '50000' },
    { key: 'price', label: 'Precio (en ARS)', type: 'number', placeholder: '15000000' },
    { key: 'transmission', label: 'Transmisión', type: 'select', options: ['Manual', 'Automática'] },
    { key: 'fuel_type', label: 'Combustible', type: 'select', options: ['Nafta', 'Diesel', 'GNC', 'Eléctrico'] },
    { key: 'gallery', label: 'Galería de Fotos', type: 'gallery' },
];


// 3. Creamos un objeto principal que exportaremos para usar en toda la app
export const LISTING_FIELDS = {
  eventos: eventFields,
  trabajos: jobFields,
  'bienes-raices': realEstateFields,
  lugares: placeFields,
  vehiculos: vehicleFields,
};