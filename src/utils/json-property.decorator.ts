export function JsonProperty(name: string) {
  return function DoJsonProperty(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const defaultValue = descriptor.get;
    descriptor.get = function() {
      if (this.data) {
        return this.data[name];
      }
      return defaultValue();
    };
    descriptor.set = function(value) {
      this.data[name] = value;
    };
  };
}
