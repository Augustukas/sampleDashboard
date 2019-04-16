package lt.firm.product.models.Controller.Dashboard;

import java.math.BigDecimal;
import java.util.Comparator;

/**
 */
public class FinalResult {
    public Double value;
    public String writeDate;
    public BigDecimal targetValue;


    public FinalResult() {
    }

    public FinalResult(Double value, String writeDate) {

        this.value = value;
        this.writeDate = writeDate;
    }
    public static Comparator<FinalResult> getCompByWriteDate() {
        return Comparator.comparing(s -> s.writeDate);
    }

    public BigDecimal valueAsBigDecimal(){
        return value !=null ? BigDecimal.valueOf(value) : null;
    }

    @Override
    public String toString() {
        return "FinalResult{" +
                "value=" + value +
                ", writeDate='" + writeDate + '\'' +
                ", targetValue=" + targetValue +
                '}';
    }
}
