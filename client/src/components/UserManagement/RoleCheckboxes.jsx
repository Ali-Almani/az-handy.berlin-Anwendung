import { ROLE_OPTIONS } from '../../utils/roles';

export default function RoleCheckboxes({
  selected = [],
  onChange,
  idPrefix = 'role'
}) {
  const values = Array.isArray(selected) ? selected : [];

  const toggle = (value) => {
    if (values.includes(value)) {
      if (values.length <= 1) return;
      onChange?.(values.filter((item) => item !== value));
      return;
    }
    onChange?.([...values, value]);
  };

  return (
    <div className="role-checkboxes" role="group" aria-label="Rollen">
      {ROLE_OPTIONS.map((opt) => {
        const id = `${idPrefix}-${opt.value.replace(/\s+/g, '-').toLowerCase()}`;
        return (
          <label key={opt.value} htmlFor={id} className="role-checkboxes__item">
            <input
              id={id}
              type="checkbox"
              checked={values.includes(opt.value)}
              onChange={() => toggle(opt.value)}
            />
            <span>{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}
