import { NgModule } from '@angular/core';
import { FaIconLibrary, FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSignOutAlt, faSpinner } from '@fortawesome/free-solid-svg-icons';

@NgModule({
  imports: [FontAwesomeModule],
  exports: [FontAwesomeModule],
})
export class FontAwesomeTestingModule {
  constructor(library: FaIconLibrary) {
    library.addIcons(faSignOutAlt);
    library.addIcons(faSpinner);
  }
}
