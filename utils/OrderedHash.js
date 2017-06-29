module.exports = class OrderedHash {
  constructor(options){
    // deserialize from JSON
    this._data = new Map();

    if(options){
      if(options.JSON){
        const inflatedData = JSON.parse(options.JSON._data);
        try {
          this._data = new Map(inflatedData);
        } catch(e){
          throw e;
        }
      } else if (options.clone){
        for(let [key, value] of options.clone._data){
          if(value !== null && typeof value === 'object')
            this.insert(key, Object.assign({}, value));
          else
            this.insert(key, value);
        }
      }

      if(options.init){
        const obj = options.init;
        for (let key in obj) {
    		  if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            if(value !== null && typeof value === 'object'){
              const clonedObj = Object.assign({}, value);
              this.insert(key, clonedObj);
            } else if (value.constructor === Array){
              const clonedArray = value.slice();
              this.insert(key, clonedArray);
            } else {
              this.insert(key, value);
            }
          }
        }
      }
    }
  }

  toJSON(){
    return {
      "_data": JSON.stringify([...this._data])
    };
  }

  [Symbol.iterator]() {
    /*let index = -1;
    const data  = this._data;

    return {
      next: () => ({ value: data[++index], done: !(index in data) })
    };*/
    return this._data.values();
  }

  map(callback){
    return [...this._data.values()].map(callback);
  }

  insert(key, value){
    return this._data.set(key, value);
  }

  //array must be an array of objects and keyField is the property of the objects
  //to use as the key.
  insertMany(iterable, keyField){
    for(let value of iterable)
      this.insert(value[keyField], value);
  }

  remove(key){
    this._data.delete(key);
  }

  get(key){
    return this._data.get(key);
  }

  //TEST
  print(msg){
    console.log(msg);
    console.log(`_data: ${JSON.stringify(this._data)}`);
    console.log(`_map: ${JSON.stringify(this._map)}`);
  }
}
