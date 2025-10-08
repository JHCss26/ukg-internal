// keep flexible: we accept any object to avoid validation-blocking
export class ReportSavedRequestDto {
  // your body like:
  // {
  //   company: { short_name: '1234567' },
  //   page: { number: 0, size: 5000 },
  //   selectors: [...]
  // }
  [key: string]: any;
}
