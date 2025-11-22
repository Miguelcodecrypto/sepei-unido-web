declare module 'node-forge' {
  export namespace asn1 {
    function fromDer(input: string | ArrayBuffer): ASN1;
    function toDer(obj: any): DerBuffer;
  }

  export namespace pki {
    function certificateToAsn1(cert: Certificate): any;
    
    namespace oids {
      const certBag: string;
    }
  }

  export namespace pkcs12 {
    function pkcs12FromAsn1(
      obj: ASN1,
      password: string,
      options?: any
    ): PKCS12Bag;
  }

  export namespace md {
    namespace sha256 {
      function create(): MessageDigest;
    }
  }

  export interface ASN1 {
    [key: string]: any;
  }

  export interface DerBuffer {
    getBytes(): string;
  }

  export interface MessageDigest {
    update(input: string | Buffer): void;
    digest(): DigestResult;
  }

  export interface DigestResult {
    toHex(): string;
  }

  export interface PKCS12Bag {
    getBags(options: any): Record<string, Bag[]>;
  }

  export interface Bag {
    cert: Certificate;
  }

  export interface Certificate {
    subject: Subject;
    issuer: Subject;
    validity: {
      notBefore: Date;
      notAfter: Date;
    };
    serialNumber: string;
    getExtension(name: string): Extension | null;
  }

  export interface Subject {
    toString(): string;
  }

  export interface Extension {
    altNames?: Array<{
      type: number;
      value: string;
    }>;
  }
}
